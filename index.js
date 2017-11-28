'use strict';
const PLUGIN_NAME = 'gulp-cleancss';
var through = require('through2'),
  gutil = require('gulp-util'),
  util = require('util'),
  glob = require('glob'),
  fs = require('fs'),
  cssUtil = require('css'),
  _ = require('lodash'),
  sourceContent,
  PluginError = gutil.PluginError;

var getFilesContent = function() {
  var patterns = _.flatten(arguments, true);

  return _.flatten(
    patterns.map(function(pattern) {
      return glob.sync(pattern).map(function(file) {
        return new String(fs.readFileSync(file));
      });
    }),
    true
  ).join('\n');
};

var filterCss = function(css, filter, index = 0, parent = []) {
  if (css.rules) {
    // console.log(util.inspect(css, false, null));
    var i = css.rules.length;
    while (i--) {
      filterCss(css.rules[i], filter, i, css.rules);
    }
  } else if (css.selectors) {
    let shouldBeRemoved = false;
    let selectorsToRemove = [];
    let selectors = css.selectors.map(sel => {
      return sel
        .replace(/\.|#|>|~|(\:){1,2}(before|after)/g, '')
        .split(' ')
        .filter(s => s.length > 0);
    });

    console.log('------');
    console.log(css.selectors);

    selectors.map((selector, selectorIndex) => {
      console.log(selector);
      let found = selector
        .map(sel => filter.indexOf(sel) >= 0)
        .reduce((s, b) => (!s ? s : b), true);

      if (!found) {
        selectorsToRemove.push(selectorIndex);
      }
    });

    console.log(selectorsToRemove);

    if (selectorsToRemove.length == css.selectors.length) {
      shouldBeRemoved = true;
    } else if (selectorsToRemove.length < css.selectors.length) {
      let j = selectorsToRemove.length;
      while (j--) {
        console.log(`remove selector '${css.selectors[selectorsToRemove[j]]}'`);
        css.selectors.splice(selectorsToRemove[j], 1);
      }
    }

    console.log(css.selectors);

    if (shouldBeRemoved) parent.splice(index, 1);
    console.log('---');
    console.log(
      `"${css.selectors.join(', ')}" ${shouldBeRemoved ? 'removed' : ''}`
    );
  }
};

var transformCss = function(cssstring, sources) {
  var checkRules = (rule, ruleIndex) => {};
  var css = cssUtil.parse(cssstring);
  var sourcesContent = getFilesContent(sources);

  // addIterations(css);

  console.log('=== CSS Rules in ===');

  filterCss(css.stylesheet, sourcesContent);

  console.log('=== CSS Rules out ===');

  css.stylesheet.rules.forEach((rootRule, rootRuleIndex) => {
    if (rootRule.rules) {
      rootRule.rules.forEach((rule, ruleIndex) => {
        if (rule.selectors) console.log(rule.selectors);
      });
    } else {
      if (rootRule.selectors) console.log(rootRule.selectors);
    }
  });

  console.log('=== HTML ===');
  console.log(sourcesContent);

  return cssUtil.stringify(css);
};

/**
 * This method is used to cleand css using files to run against it
 * @param  {string|array} sources Source files used to clean css
 * @return {stream}               cleaned css
 */
var gulpCleancss = function(sources) {
  return through.obj(function(file, enc, cb) {
    var isBuffer = false,
      inputString = null,
      result = null,
      outBuffer = null;
    //Empty file and directory not supported
    if (file === null || file.isDirectory()) {
      this.push(file);
      return cb();
    }
    isBuffer = file.isBuffer();
    if (isBuffer) {
      inputString = new String(file.contents);

      var outputString = transformCss(inputString, sources);

      // console.log(outputString);

      outBuffer = new Buffer(outputString);
      var aFile = new gutil.File();
      aFile.path = file.path;
      aFile.contents = outBuffer;
      cb(null, aFile);
    } else {
      this.emit(
        'error',
        new PluginError(PLUGIN_NAME, 'Only Buffer format is supported')
      );
      cb();
    }
  });
};
//Export the Method
module.exports = gulpCleancss;
