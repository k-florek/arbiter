
module.exports.replaceAt = replaceAt;


function replaceAt(index,replacement,string) {
  return string.substr(0, index) + replacement+ string.substr(index + replacement.length);
}
