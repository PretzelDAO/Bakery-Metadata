const coatingList = ['None', 'Brown', 'White']

const topppingList = [
  'None',
  'StripesWhite',
  'StripesBrown',
  'StripesRainbow',
  'StripesPretzelDAO',
  'SprinklesWhite',
  'SprinklesBrown',
  'SprinklesRainbow',
  'SprinklesPretzelDAO',
  'DotsWhite',
  'DotsBrown',
  'DotsRainbow',
  'DotsPretzelDAO',
]

function camelToUnderscore(key) {
  var result = key.replace(/([A-Z])/g, ' $1')
  return result.split(' ').join('_').toLowerCase()
}

console.log(camelToUnderscore('ItemName'))

function buildImages(bg, half, salt, coating, topping) {
  let ret = []
  ret.push({
    input: `./sugar-pretzels/${bg}.png`,
    top: 0,
    left: 0,
  })
  //quick-fix to make it possible without parsing arguments
  ret.push({
    input: `./sugar-pretzels/classic.png`,
    top: 0,
    left: 0,
  })

  const prefix = half ? 'half' : 'full'
  if (coating > 0) {
    ret.push({
      input: `./sugar-pretzels/${
        prefix + camelToUnderscore(coatingList[coating])
      }.png`,
      top: 0,
      left: 0,
    })
  }
  if (topping > 0) {
    ret.push({
      input: `./sugar-pretzels/${
        prefix + camelToUnderscore(topppingList[topping])
      }.png`,
      top: 0,
      left: 0,
    })
  }
  if (salt) {
    ret.push({
      input: `./sugar-pretzels/salt.png`,
      top: 0,
      left: 0,
    })
  }
  console.log('making pretzel:', ret)
  return ret
}

module.exports = {
  buildImages,
  coatingList,
  topppingList,
}
