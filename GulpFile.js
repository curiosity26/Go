var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var fs = require("fs");

gulp.task('minify-web', function() {
    var replacement = fs.readFileSync('./src/go-src.js');
    return gulp.src('./src/go.js')
        .pipe(replace('/* inject */', replacement))
        .pipe(uglify())
        .pipe(rename({ extname: '.min.js' }))
        .pipe(gulp.dest('./dist'));
});

gulp.task('minify-njs', function() {
    var replacement = fs.readFileSync('./src/go-src.js');
    return gulp.src('./src/index.js')
        .pipe(replace('/* inject */', replacement))
        .pipe(uglify())
        .pipe(rename({ extname: '.min.js' }))
        .pipe(gulp.dest('./dist'));
});

gulp.task('default', ['minify-web', 'minify-njs']);