angular.module('app.animations', ['ngAnimate'])
  .animation('.reveal', function() {
    return {
      enter : function(element, done) {
        var files = element.find('.gist-file');
        files.css({
          'opacity':0,
          'left':-50,
          'position':'relative'
        });
        var height = element.height();
        TweenMax.fromTo(element, 1.5, {height:0}, {
          height:height,
          onComplete : function() {
            element.css('height','auto');
            TweenMax.staggerTo(files, 1.5, {left:0,opacity:1}, 0.2, done);
          }
        });
      }
    }
  });
