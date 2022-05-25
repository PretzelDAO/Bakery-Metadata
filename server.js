const express = require("express");
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
const Eth = require("ethjs");
const {
  buildImages,
  coatingList,
  topppingList: toppingList,
} = require("./image_mapping");
const Keyv = require("keyv");
const { uploadJsonData } = require("./uploadToIpfs");

const metadatacache = new Keyv({ ttl: 3 });

const eth = new Eth(
  new Eth.HttpProvider(
    "https://kovan.infura.io/v3/31be2774d4d5424d907d13673b7681b8"
  )
);

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

async function makeData(toCompose, id) {
  try {
    const result = await sharp("./sugar-pretzels/classic.png")
      .composite(toCompose)
      .toFile(`generated/${id}.png`);
    console.log(result);
  } catch (error) {
    console.log(`An error occurred during processing: ${error}`);
  }
}

app.get("/bakery/:tokenid", async (req, res) => {
  let tokenid = req.params.tokenid;
  await db.serialize(() => {
    db.all(
      `SELECT rowid AS id, tokenid, link FROM ipfsmap WHERE tokenid=${tokenid}`,
      async (err, data) => {
        if (err) {
          console.log("Problems:", err);
          return;
        }
        console.log("gotten", data);
        if (data && data.length > 0) {
          console.log("EXISTING");
          return res.redirect(
            301,
            "https://" + data[data.length - 1].link + ".ipfs.nftstorage.link"
          );

          //   return res.send(data[data.length - 1].link)
        }

        const maxIndex = await token.totalSupply();
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

        const cached_values = await metadatacache.get(tokenid);
        if (typeof cached_values !== "undefined") {
          values = cached_values;
        } else {
          // generate pretzel
          values = await token.pretzelData(tokenid);
          await metadatacache.set(tokenid, values);
          console.log(
            "got pretzel",
            values,
            values["background"],
            values.background.words[0]
          );
          const przlprops = buildImages(
            values.background,
            values.half,
            values.salt,
            values.coating,
            values.topping
          );

          if (!checkFileExistsSync(`generated/${tokenid}.png`)) {
            await makeData(przlprops, tokenid);
          }
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

        const { hashCID } = await uploadJsonData(JSON.stringify(metadata));
        await db.serialize(() => {
          const stmt = db.prepare("INSERT INTO ipfsmap VALUES (?,?)");
          stmt.run(hashCID, tokenid);
          stmt.finalize();
        });

        //   res.writeHead(200, { 'Content-Type': 'application/json' })
        res.redirect(301, "https://" + hashCID + ".ipfs.nftstorage.link");
        //   res.send(await sharp('./sugar-pretzels/0.png'))
      }
    );
  });
});
// Set up second page
app.get("/second", (req, res) => {
  res.send("This is the second page");
});

app.listen(port, () => {
  console.log(`Success! Your application is running on port ${port}.`);
});
