const fs = require('fs')
const { NFTStorage, File, Blob } = require('nft.storage')

async function uploadJsonData(JsonData) {
  console.log('Starting logging:', process.env.NFT_STORAGE_API_KEY)
  const client = new NFTStorage({ token: process.env.NFT_STORAGE_API_KEY })

  console.log('Uploding json...')

  // const imageFile = new File([imageData], `${baseFileName}.${imgType}`, {
  //   type: `image/${imgType}`,
  // })
  const someData = new Blob([JsonData])
  const hashCID = await client.storeBlob(someData)

  //   console.log('Uploding mp4...');
  //   const animationData = fs.readFileSync(`./assets/${baseFileName}.mp4`)
  //   const animationFile = new File([animationData], `${baseFileName}.mp4`, { type: ' video/mp4' });
  //   const animationCID = await client.storeBlob(animationFile);

  return {
    hashCID,
  }
}

async function uploadData(baseFileName, isJPG) {
  let imgType
  if (isJPG) imgType = 'jpg'
  else imgType = 'png'
  console.log('Starting logging:', process.env.NFT_STORAGE_API_KEY)
  const client = new NFTStorage({ token: process.env.NFT_STORAGE_API_KEY })

  console.log('Uploding image...')
  const imageData = fs.readFileSync(
    `./sugar-pretzels/${baseFileName}.${imgType}`,
  )
  const imageFile = new File([imageData], `${baseFileName}.${imgType}`, {
    type: `image/${imgType}`,
  })
  const imageCID = await client.storeBlob(imageFile)

  //   console.log('Uploding mp4...');
  //   const animationData = fs.readFileSync(`./assets/${baseFileName}.mp4`)
  //   const animationFile = new File([animationData], `${baseFileName}.mp4`, { type: ' video/mp4' });
  //   const animationCID = await client.storeBlob(animationFile);

  return {
    imageCID,
  }
}

async function main() {
  //   const { imageCID } = await uploadData('0', false)
  const { imageCID } = await uploadJsonData(
    JSON.stringify({ tryial: 3, new: 'joo' }),
  )

  console.log('================================================')
  console.log(`Image CID: ${imageCID}`)
  //   console.log(`Animation CID: ${animationCID}`)
  console.log('Put those two hashes in the argument.js file')
  console.log('================================================')
}
// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error)
//     process.exit(1)
//   })

module.exports = {
  uploadJsonData,
}
