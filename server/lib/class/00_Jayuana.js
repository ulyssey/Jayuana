
//TODO: replace all this by self in all files
//TODO: replace all *getBy* by *getBy*InDb
//TODO: create _getActiveBy, getActiveByName and getActiveById
//TODO: create prototype.getId and .getName

/*TODO: create test for:
*   J.
*   _getActiveBy
*   getActiveById
*   getActiveByName
*
*   J.proto.
*   _addRef
*   addRef
*   write doc for each method
*
* */

J = (function(){
  "use strict";
  /**
   *
   * @param element
   * @constructor
   */
  var J = function (element) {
    if (this instanceof J){
      var self = this;

      self.objType = "Jayuana";

      if (!element){
        throw J.Error("J.constructor", "no element passed");
      }
      if (!element.refsFrom){
        element.refsFrom = null;
      }
      if (!element.refsTo){
        element.refsTo = null;
      }

      //J[element._id] = self;

      self._element = element;
      self._id = element._id;
      self._name = element.name;
      self._refsFrom = new J.References(element.refsFrom);
      self._refsTo = new J.References(element.refsTo);
      eval("element.obj =" + element.objToEval);  //jshint ignore: line
      self._obj = element.obj;

      J._activated.push(self);
    }
    else{
      throw new J.Error("J", "must be called with the 'new' keyword");
    }
  };

  /**#@+
   * @public
   */

  J.prototype = {};

  J.prototype.run = function(){
    console.log("+ start J.prototype.run");
    var self = this;
    self._obj();
    console.log("- end J.prototype.run");
  };

  /**
   * Add references with an other object
   * @param {Object} options
   * @param {RefType} options.refType
   * @param {ObjInfo} options.otherObj must contain idInDb or nameInDb property,
   * nameInDb is ignored if idInDb is found
   * @param {string} [options.nameRef = options.otherObj._name]
   * @param {string} [options.nameSelfForOtherRef = self._name]
   */
  J.prototype.addRef = function(options){
    var id, name, otherJayuana, refInfo;
    var self = this;
    if (Match.test(options.otherObj.idInDb, String)){
      id = options.otherObj.idInDb;
      otherJayuana = J.getActiveById(id);
      name = options.nameRef || otherJayuana._name;
    }
    else if (Match.test(options.otherObj.nameInDb, String)){
      name = options.otherObj.nameInDb;
      otherJayuana = J.getActiveByName(name);
      id = otherJayuana._id;
    }
    else{
      throw new J.Error("J.addRef", "no valid Id neither name");
    }

    refInfo = {
      idInDb: id,
      localName: name,
      activeElt: otherJayuana
    };

    self._addRef(refInfo, options.refType,
      options.nameSelfForOtherRef || self._name);
  };

  /**#@-*/
  /**#@+
   * @private
   */

  /**
   *
   * @param {RefInfo} refInfo of the other Jayuana object
   * @param {RefType} refType
   * @param {string} [nameSelfForOtherRef = refInfo.element._id]
   * @private
   */
  J.prototype._addRef = function(refInfo, refType, nameSelfForOtherRef){
    var self = this;
    var otherJayuana = refInfo.element;
    var refToSelf = {
      id: self._id,
      name: nameSelfForOtherRef || self._name,
      element: self._element
    };
    switch(refType){
      case 'to':
        self._refsTo.add(refInfo);
        otherJayuana._refsFrom.add(refToSelf);
        break;
      case 'from':
        otherJayuana._refsTo.add(refToSelf);
        self._refsFrom.add(refInfo);
        break;
      case 'both':
        self._refsTo.add(refInfo);
        self._refsFrom.add(refInfo);
        otherJayuana._refsTo.add(refToSelf);
        otherJayuana._refsFrom.add(refToSelf);
        break;
      default :
        throw new J.error("Jobj.addRef");
    }
  };


  /**#@-*/



  // STATICS PROPERTIES:
  J._activated = [];

  // STATICS METHODS:
  J._starter = function(){};

  J.init = function (options) {
    console.log("+ start J.init()");
    var fs = Npm.require('fs');

    if (J.db === undefined) {
      J._rootPath = process.env.PWD + "/";

      if((options) && (options.folderName)){
        J._folderName = options.folderName + "/";
      }
      else{
        J._folderName = C.DEFAULT_FOLDER + "/";
      }

      try {
        fs.mkdirSync(J._rootPath + J._folderName);
      }
      catch(e){
        if (e.code !== 'EEXIST') {
          throw e;
        }
      }

      J.db = new Mongo.Collection("jayuanaDb");

      //TODO : verify that any modifying file inside the folder will not
      //TODO : restart the server (path must begin with a dot)
    }

    J._wipe();
    console.log("- end J.init()");
  };

  J.add = function(oneOreMoreElts, callback){
    var eltsDef = [];
    var callbackOnce;
    if (_.isArray(oneOreMoreElts)){
      eltsDef = oneOreMoreElts;
    }
    else{
      eltsDef[0] = oneOreMoreElts;
    }
    callbackOnce = _.after(eltsDef.length, callback);
    eltsDef.forEach(function (eltDef) {
      J._addOne(eltDef.obj, eltDef.type, eltDef.name, eltDef.start,
        callbackOnce);
    });
  };

  J._addOne = function(obj, type, name, start, callback){
    console.log("+ start J._addOne( " + name + " )");
    var objUnderTest, element, id, data, filePath;
    var fs = Npm.require('fs');

    name = name || '';
    start = start || false;
    element = {
      name: name,
      type: type,
      start: start,
      available: false,
      path: 'unknown'
    };

    if((type !== "EJSON") && (type !== "code") && (type !== "file")){
      throw new J.Error("J.add", "type not defined correctly");
    }

    switch (type){
      case "EJSON":
        objUnderTest = obj;
        data = EJSON.stringify(obj);
        break;

      case "code":
        try{
          eval('objUnderTest = ' + obj); //jshint ignore:line
        }
        catch (e){
          throw new J.Error("J.add", "eval(): " + e.message);
        }
        data = obj;

        break;

      case "file":

        break;
    }

    if (objUnderTest === undefined){
      throw new J.Error("J.add", "undefined object");
    }

    if ((element.start === true) && !(_.isFunction(objUnderTest))){
      throw new J.Error("J.add",
        "start flag true and object is not a function");
    }

    id = J.db.insert(element);
    filePath = J._rootPath + J._folderName + id;

    fs.writeFile(filePath, data, Meteor.bindEnvironment(function (e) {
      if (e) {
        J.db.remove(id);
        //TODO : should not throw an Error but pass the Error to callback(e, id)
        //TODO : save it in a log
        throw new J.Error("J.add", "writeFile: " + e.message);
      }
      else{
        console.log("- end J.add( " + name + " )");
        J.db.update({_id: id},{$set: {
          available: true,
          path: filePath}});

        if (callback){
          callback(id);
        }
      }
    }));
  };

  J._getBy = function(condition, callback){
    var fs = Npm.require('fs');
    var element = J.db.findOne(condition);

    fs.readFile(element.path, {encoding: 'utf8'}, function (err, data){
      if(!err){
        element.objToEval = data;
      }
      if (callback){
        callback(err, element);
      }
    });
  };

  J._getActiveBy = function(condition){
    var index = _.findIndex(J._activated, function (value) {
      var pattern = Match.ObjectIncluding(condition);
      Meteor.test(value, pattern);
    });
    return J._activated[index];
  };

  J.getById = function (id, callback) {
    J._getBy({_id: id }, callback);
  };

  J.getByName = function(name, callback) {
    J._getBy({name: name}, callback);
  };

  J.getActiveById = function (id) {
    J._getActiveBy({id:id});
  };

  J.getActiveByName = function (name) {
    J._getActiveBy({_name:name});
  };

  J.start = function(){
    console.log("+ start J.start()");
    J._getBy({start: true}, function (err, element) {
      if(err){
        throw err;
      }
      else{
        J._starter = new J(element);
        J._starter.run();
        console.log("- end J.start()");
      }
    });
  };

  //TODO if necesary:
  J._addRef = function (element1, element2, relation){
    if((element1.objType !== "Jayuana") || (!element1.objType !=="Jayuana")){
      throw new J.Error("J._addRef", "at least one element is not a Jayuana " +
        "object");
    }
    if (relation === 'both'){

    }
    else if (relation === 'fromTo'){

    }
    else{
      throw new J.Error("J._addRef", "relation type wrong");
    }
  };

  J._wipe = function () {
    //remove all files within the folder:
    utils._emptyDirectory(process.env.PWD + "/" + J._folderName);

    //empty the db:
    J.db.remove({});

    //clean the activated elts:
    J._activated = [];
  };

  return J;
})();
