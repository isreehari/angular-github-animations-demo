angular.module('app.animations', ['ngAnimate'])

  .animation('.reveal', function() {
    return {
      enter : function(element, done) {
        var height = element.height();
        TweenLite.fromTo(element, 1.5, {height:0}, {height:height, onComplete : function() {
          element.css('height','auto');
          done();
        }});
      }
    }
  });
