var gulp = require('gulp');
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');

gulp.task('html', function () {
    return gulp.src('src/index.htm')
        .pipe(gulp.dest('dist'));
});

gulp.task('js', function () {
    var bundler = browserify('src/js/app.js', {
        debug: true
    })
    .transform(babelify);
    
    return bundler.bundle()
        .on('error', function(error){
            console.error("There was this error your see: ", error);
        })
        .pipe(source('app.js'))
        .pipe(buffer())
        .pipe(gulp.dest('dist/js'));
});

gulp.task('default', ['html', 'js']);