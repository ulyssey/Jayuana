/**
 * Created by yoh on 5/10/15.
 */
utils = {
  fs: Npm.require('fs'),

  _emptyDirectory: function (target) {
    utils.fs.readdirSync(target).forEach(function (element) {
      utils._rm(path.join(target, element));
    });
  },

  _rm: function (target) {
    if (utils.fs.statSync(target).isDirectory()){
      utils._emptyDirectory(target);
      utils.fs.rmdirSync(target);
    }
    else{
      utils.fs.unlinkSync(target);
    }
  }
};