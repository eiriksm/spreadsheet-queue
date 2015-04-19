var gulp = require('gulp');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var livereload = require('gulp-livereload');
var prefix = require('gulp-autoprefixer');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('scripts', function() {
  browserify('./js/browser.js', {
      debug: true,
      transform: 'brfs'
    })
    .bundle()
    .pipe(source('build.js'))
    .pipe(gulp.dest('./build'));
});

gulp.task('styles', function() {
  gulp.src('scss/style.scss')
    //.pipe(sourcemaps.init())
    .pipe(sass({
      includePaths: [
        'node_modules/font-awesome/scss',
        'node_modules/foundation.scss'
      ],
      outputStyle: 'expanded',
      errLogToConsole: true,
      error: function(err) {
        console.log(JSON.stringify(err));
      }
    }))
    .pipe(sourcemaps.write())
    .pipe(prefix("last 1 version", "> 1%", "ie 8", "ie 7"))
    .pipe(gulp.dest('public/css'));
});

gulp.task('watch', function() {
  livereload.listen();
  gulp.watch(['public/**']).on('change', function() {
    var args = arguments;
    setTimeout(function() {
      livereload.changed.apply(this, args);
    }, 200);
  });
  gulp.watch(['js/**/*.js', '!js/build/*.js', 'browser.html', 'js/partials/**/*'], ['scripts']);
  gulp.watch(['scss/**/*'], ['styles']);
  gulp.watch(['test/e2e/**/*'], ['e2escripts']);
});
