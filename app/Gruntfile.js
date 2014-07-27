/*global module: true */

module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: ['Gruntfile.js', '*.js'],
      options: {
        // options here to override JSHint defaults
        globals: {
          console: true,
          module: true,
          document: true
        }
      }
    },
    nodemon: {
      dev: {
        script: 'app.js',
        cwd: '.',
        watch: ['.'],
        ignore: ['node_modules/**']
      }
    },
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-nodemon');

  grunt.registerTask('test', ['jshint']);
  grunt.registerTask('default', ['jshint', 'nodemon']);
};
