const express = require("express");
var cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const port = 4000;

// const mergeImages = require('merge-images')
var images = require("images");

fs = require("fs");
http = require("http");
url = require("url");

const sharp = require("sharp");

const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("data/pretzels.db");

const dotenv = require("dotenv");
dotenv.config();

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS ipfsmap (link TEXT, tokenid NUMBER) ");
});

// db.close()

// Add the bodyParser middelware to the express application
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

app.use(cors());
const Eth = require("ethjs");
const {
  buildImages,
  coatingList,
  topppingList: toppingList,
} = require("./image_mapping");
const Keyv = require("keyv");
const { uploadJsonData } = require("./uploadToIpfs");

const metadatacache = new Keyv({ ttl: 8000 });

const eth = new Eth(new Eth.HttpProvider(process.env.RPC_ENDPOINT));

const tokenABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "pretzelData",
    outputs: [
      {
        internalType: "uint8",
        name: "background",
        type: "uint8",
      },
      {
        internalType: "bool",
        name: "half",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "salt",
        type: "bool",
      },
      {
        internalType: "enum SugarPretzels.Coating",
        name: "coating",
        type: "uint8",
      },
      {
        internalType: "enum SugarPretzels.Topping",
        name: "topping",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "currentConditions",
    outputs: [
      {
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
      {
        internalType: "uint24",
        name: "precipitationPast12Hours",
        type: "uint24",
      },
      {
        internalType: "uint24",
        name: "precipitationPast24Hours",
        type: "uint24",
      },
      {
        internalType: "uint24",
        name: "precipitationPastHour",
        type: "uint24",
      },
      {
        internalType: "uint24",
        name: "pressure",
        type: "uint24",
      },
      {
        internalType: "int16",
        name: "temperature",
        type: "int16",
      },
      {
        internalType: "uint16",
        name: "windDirectionDegrees",
        type: "uint16",
      },
      {
        internalType: "uint16",
        name: "windSpeed",
        type: "uint16",
      },
      {
        internalType: "uint8",
        name: "precipitationType",
        type: "uint8",
      },
      {
        internalType: "uint8",
        name: "relativeHumidity",
        type: "uint8",
      },
      {
        internalType: "uint8",
        name: "uvIndex",
        type: "uint8",
      },
      {
        internalType: "uint8",
        name: "weatherIcon",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

function checkFileExistsSync(filepath) {
  let flag = true;
  try {
    fs.accessSync(filepath, fs.constants.F_OK);
  } catch (e) {
    flag = false;
  }
  return flag;
}

const token = eth.contract(tokenABI).at(process.env.SUGAR_PRETZEL_ADDRESS);

console.log("STARTING FOR:", process.env.SUGAR_PRETZEL_ADDRESS);
async function makeData(toCompose, id) {
  try {
    const result = await sharp("./sugar-pretzels/classic.svg")
      .composite(toCompose)
      .toFile(`generated/${id}.png`);
    console.log(result);
  } catch (error) {
    console.log(`An error occurred during processing: ${error}`);
  }
}

app.get("/sugarpretzel/:tokenid", async (req, res) => {
  let tokenid = req.params.tokenid;
  try {
    await db.serialize(() => {
      db.all(
        `SELECT rowid AS id, tokenid, link FROM ipfsmap WHERE tokenid=${tokenid}`,
        async (err, data) => {
          if (err) {
            console.log("Problems:", err);
            return;
          }
          if (data && data.length > 0) {
            console.log("EXISTING", tokenid);
            return res.redirect(
              301,
              "https://" + data[data.length - 1].link + ".ipfs.nftstorage.link"
            );

            //   return res.send(data[data.length - 1].link)
          }

          const maxIndex = await token.totalSupply();
          console.log("max id:", maxIndex);
          if (tokenid >= maxIndex[0].words[0]) {
            return res.send("Non-existent token ID");
          }
          // console.log('max:', maxIndex[0], tokenid)
          // console.log('max index:', tokenid > maxIndex[0].words[0])
          //   const img = readFile('') //images('sugar-pretzels/0.png')
          //   await getMetadata()
          console.log("TOKEN", token);
          if (!tokenid) return res.end("Sorry, invalid tokenid");

          let values;

          let cached = false;
          const cached_values = await metadatacache.get(tokenid);
          if (typeof cached_values !== "undefined") {
            values = cached_values;
            cached = true;
          } else {
            // generate pretzel
            values = await token.pretzelData(tokenid);

            let valuearray = [
              values.background,
              values.half,
              values.salt,
              values.coating,
              values.topping,
            ].map((e) => e <= 0);
            console.log("got pretzel for ID:", tokenid, values, valuearray);
            if (valuearray.every((e) => e)) {
              console.log("RPC BROKE!!!");
              //retry
              values = await token.pretzelData(tokenid);
              valuearray = [
                values.background,
                values.half,
                values.salt,
                values.coating,
                values.topping,
              ].map((e) => e <= 0);
              if (values.every((e) => e)) {
                var img = fs.readFileSync(`placeholder.png`);
                const metadata = {
                  description: "Sweet, Delicious Pretzels, sweet version.",
                  external_url: "https://pretzeldao.com",
                  name: "Sugar Pretzel #" + tokenid,
                  attributes: [
                    {
                      trait_type: "unrevealed",
                      value: true,
                    },
                  ],
                  image: "data:image/png;base64," + img.toString("base64"),
                };

                return res.end(JSON.stringify(metadata));
              }
            }
            await metadatacache.set(tokenid, values);
            const przlprops = buildImages(
              values.background,
              values.half,
              values.salt,
              values.coating,
              values.topping
            );

            // if (!checkFileExistsSync(`generated/${tokenid}.png`)) {
            await makeData(przlprops, tokenid);
            // }
          }
          //return the cached or newly created file
          var img = fs.readFileSync(`generated/${tokenid}.png`);
          const metadata = {
            description: "Sweet, Delicious Pretzels, sweet version.",
            external_url: "https://pretzeldao.com",
            name: "Sugar Pretzel #" + tokenid,
            attributes: [
              {
                trait_type: "background",
                value: values.background,
              },
              {
                trait_type: "half",
                value: values.half,
              },
              {
                trait_type: "salt",
                value: values.salt,
              },
              {
                trait_type: "coating",
                value: coatingList[values.coating],
              },
              {
                trait_type: "topping",
                value: toppingList[values.topping],
              },
            ],
            image: "data:image/png;base64," + img.toString("base64"),
          };

          res.send(JSON.stringify(metadata));
          if (cached) {
            //ipfs upload most likely in progress
            return;
          }
          const { hashCID } = await uploadJsonData(JSON.stringify(metadata));
          await db.serialize(() => {
            const stmt = db.prepare("INSERT INTO ipfsmap VALUES (?,?)");
            stmt.run(hashCID, tokenid);
            stmt.finalize();
          });
          console.log("DONE");

          //   res.writeHead(200, { 'Content-Type': 'application/json' })
          // res.redirect(301, "https://" + hashCID + ".ipfs.nftstorage.link");
          //   res.send(await sharp('./sugar-pretzels/0.png'))
        }
      );
    });
  } catch (e) {
    console.log("WE BROKE!!!!", e.message);
  }
});

app.post("/getconditions", async (req, res) => {
  console.log("code", req.body);
  if (req.body.code !== process.env.accesscode) {
    return res.send("Not Authenticated!");
  }
  const conditions = await token.currentConditions();
  return res.send(conditions);
});
// Set up second page
app.get("/second", (req, res) => {
  res.send("This is the second page");
});

app.listen(port, () => {
  console.log(`Success! Your application is running on port ${port}.`);
});
