var cleancss = require('../index.js');
var gulp = require('gulp');

gulp.task('example', function() {
  gulp
    .src('stylesheet.css')
    .pipe(require('../index.js')(['in.*']))
    .pipe(gulp.dest('dist'));
});
