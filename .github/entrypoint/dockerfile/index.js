/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 **/
'use strict';

var path = require('path');
var util = require('util');

var doxyparser = require('./scripts/parser');
var templates = require('./scripts/templates');
var helpers = require('./scripts/helpers');

module.exports = {

  /**
   * Default options values.
   **/
  defaultOptions: {

    directory: null,            /** Location of the doxygen files **/
    output: 'api.md',           /** Output file **/
    groups: false,              /** Output doxygen groups separately **/
    noindex: false,             /** Disable generation of the index. Does not work with `groups` option **/
    anchors: true,              /** Generate anchors for internal links **/
    language: 'cpp',            /** Programming language **/
    templates: 'templates',     /** Templates directory **/
    pages: false,               /** Output doxygen pages separately **/
    classes: false,             /** Output doxygen classes separately **/

    filters: {
      members: [
        'define',
        'enum',
        // 'enumvalue',
        'func',
        // 'variable',
        'property',
        'public-attrib',
        'public-func',
        'protected-attrib',
        'protected-func',
        'signal',
        'public-slot',
        'protected-slot',
        'public-type'
      ],
      compounds: [
        'namespace',
        'class',
        'struct',
        'union',
        'typedef',
        // 'file'
      ]
    }
  },

  /**
   * Parse files and render the output.
   **/
  run: function (options) {

    // Sanitize options
    if (options.groups == options.output.indexOf('%s') === -1)
      throw "The `output` file parameter must contain an '%s' for group name " +
        "substitution when `groups` are enabled."

    if (options.templates == this.defaultOptions.templates)
      options.templates = path.join(__dirname, 'templates', options.language);

    // Load templates
    templates.registerHelpers(options);
    templates.load(options.templates);

    // Parse files
    doxyparser.loadIndex(options, function (err, root) {
      if (err)
        throw err;
      // Output groups
      if (options.groups) {
        var groups = root.toArray('compounds', 'group');
        if (!groups.length)
          throw "You have enabled `groups` output, but no groups were " +
            "located in your doxygen XML files."

        groups.forEach(function (group) {
          group.filterChildren(options.filters, group.id);

          var compounds = group.toFilteredArray('compounds');
          compounds.unshift(group); // insert group at top
          var contents = templates.renderArray(compounds);
          helpers.writeFile(util.format(options.output, group.name), contents);
        });
      }
      else if (options.classes) {
        var rootCompounds = root.toArray('compounds');
        if (!rootCompounds.length)
          throw "You have enabled `classes` output, but no classes were " +
            "located in your doxygen XML files."
        rootCompounds.forEach(function (comp) {
          var compounds = comp.toArray();
          compounds.forEach(function (e) {
            e.filterChildren(options.filters)
            var contents = templates.render(e);
            helpers.writeFile(util.format(options.output, e.name), [contents]);
          });
        });
      }
      // Output single file
      else {
        root.filterChildren(options.filters);

        var compounds = root.toFilteredArray('compounds');
        if (!options.noindex)
          compounds.unshift(root); // insert root at top if index is enabled
        var contents = templates.renderArray(compounds);
        contents.push('Generated by [Moxygen](https://sourcey.com/moxygen)')
        helpers.writeFile(options.output, contents);
      }

      if(options.pages){
        var pages = root.toArray('compounds', 'page');
        if(!pages.length)
          throw "You have enabled `pages` output, but no pages were " +
            "located in your doxygen XML files."
        pages.forEach(function(page){
          var compounds = page.toFilteredArray('compounds');
          compounds.unshift(page);
          var contents = templates.renderArray(compounds);
          helpers.writeFile(path.dirname(options.output) + "/page-" + page.name + ".md", contents);
        })
      }

    });
  }
}
