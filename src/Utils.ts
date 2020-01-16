export const isIterable = obj =>
  obj && typeof obj[Symbol.iterator] === 'function'
export const isIterableIterator = obj =>
  isIterable(obj) && typeof obj.next === 'function'

export const guid = (function() {
  let counter = 0

  return function(prefix = 'o_') {
    let guid = new Date().getTime().toString(32),
      i

    for (i = 0; i < 5; i++) {
      guid += Math.floor(Math.random() * 65535).toString(32)
    }

    return prefix + guid + (counter++).toString(32)
  }
})()

export const invariant = (expr, errMsg) => {
  if (expr) {
    throw new Error(errMsg)
  }
}

export const isPromise = obj => obj && typeof obj.then === 'function'

export const random = (min, max) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min //The maximum is exclusive and the minimum is inclusive
}
