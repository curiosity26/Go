var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var browserify = require('gulp-browserify');
var fs = require("fs");

gulp.task('minify-web', function() {
    return gulp.src('./src/go.js')
        .pipe(browserify({
            insertGlobals : true,
            debug : true
        }))
        .pipe(uglify())
        .pipe(rename({ extname: '.min.js' }))
        .pipe(gulp.dest('./dist'));
});

gulp.task('default', ['minify-web']);