module.exports = {
  hooks: {
    readPackage(pkg, context) {
      if (pkg.name === 'electron') {
        pkg.scripts = pkg.scripts || {}
        pkg.scripts.install = 'node install.js'
        pkg.scripts.postinstall = 'node install.js'
      }
      return pkg
    }
  }
}
