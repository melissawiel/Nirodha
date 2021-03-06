var fs = require('fs');
var logger = require('./logging.js');
var async = require('async');

var scriptStart = '<script type="text/javascript" src="';
var scriptEnd = '"></script>\n';

var styleStart = '<link rel="stylesheet" href="';
var styleEnd = '">\n';

var TEMPLATE_KEY = '{templates}';

var view;
var directory;

/**
 * Expose the root.
 */

exports = module.exports = new ViewManager();

/**
 * Expose `ViewManager`.
 */

exports.ViewManager = ViewManager;

function ViewManager() {

}

ViewManager.prototype.init = function(pDirectory, pView) {
	directory = pDirectory;
	view = pView;
};

function insertLibrariesAt(text, libobject, callback) {

	// logger.log('text dump: ' + JSON.stringify(text));
	logger.log('libobject dump: ' + JSON.stringify(libobject));
	var start = text.indexOf(libobject.title);
	var end = start + libobject.title.length;
	var firstpart = text.substring(0, start);
	var lastpart = text.substring(end, text.length);

	var jsfiles = libobject.libs.js;
	var cssfiles = libobject.libs.css;

	async.series([
		// Insert js files
		function(cb) {
			logger.log('Entering loop to add js libraries', 7);
			logger.log('JS Library lengths: ' + jsfiles.length, 7);
			// Insert references to the new js library files
			var jsincludes = "";
			if(jsfiles.length === 0) {
				cb(null, jsincludes);
			}
			else {
				for(var i = 0; i < jsfiles.length; i++) {
					logger.log('Inserting the following js library: ' + jsfiles[i], 7);
					jsincludes += (scriptStart + jsfiles[i] + scriptEnd);
					if(i == jsfiles.length-1) {
						cb(null, jsincludes);
					}
				}
			}
		},
		//Insert css files
		function(cb) {
			logger.log('Entering loop to add css libraries', 7);
			logger.log('CSS Library length: ' + cssfiles.length, 7);
			// Insert references to the new css library files
			var cssincludes = "";
			if(cssfiles.length === 0) {
				cb(null, cssincludes);
			}
			else {
				for(var i = 0; i < cssfiles.length; i++) {
					logger.log('Inserting the following css library: ' + cssfiles[i], 7);
					cssincludes += (styleStart + cssfiles[i] + styleEnd);
					if(i == cssfiles.length-1) {
						cb(null, cssincludes);
					}
				}
			}
		}
	], 
	function(err, results) {
		logger.log('Inserting the following js results: ' + results[0]);
		logger.log('Inserting the following css results: ' + results[1]);
		
		callback(firstpart + results[0].toString() + results[1].toString() + lastpart);
	});
}

// Accepts a response object and parses a view into it
ViewManager.prototype.parse = function(res) {

/*
*	Parse the libraries included in the thtml
*/

	// Get the page text for the view by removing the .html portion of the request and parsing the view
	var pageText = fs.readFileSync(directory + view).toString();

	var includes = JSON.parse(fs.readFileSync(directory + view.substring(0, view.length-5) + '.json').toString());

	// Get a list of the strings to search for in the html file

	var addToPageText = function(finalText) {
		pageText = finalText;
	};

	async.series([
		function(cb) {
			for(var i = 0; i < includes.length; i++) {
				// logger.log('index: ' + i + ' , pageText: ' + pageText);
				insertLibrariesAt(pageText, includes[i], addToPageText);
			}
			cb();
		},
		function(cb) {
			// Add templates in
			var template_filename = directory + '/custom/templates/' + view.substring(0, view.length-5) + '_templates.html';
			logger.log('Adding the templates html to the core html file...');
			logger.log('Loading the following file: ' + template_filename);
			var template_text = fs.readFileSync(template_filename).toString();

			var start = pageText.indexOf(TEMPLATE_KEY);
			var end  = pageText.indexOf(TEMPLATE_KEY) + TEMPLATE_KEY.length;
			var firstpart = pageText.substring(0, start);
			var lastpart = pageText.substring(end, pageText.length);
			res.end(firstpart + template_text + lastpart);
		}
	]);
};
