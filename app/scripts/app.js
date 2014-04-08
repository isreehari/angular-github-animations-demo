angular.module('myApp', ['ngAnimate', 'ngRoute', 'app.homePages','app.ghAPI','app.animations'])

  .constant('TPL_PATH', '/templates')

  .config(function($routeProvider, $locationProvider, $sceProvider, TPL_PATH) {
    $sceProvider.enabled(false);
    $locationProvider.hashPrefix('!');
    $routeProvider
      .when('/',{
        controller : 'ReposCtrl',
        templateUrl : TPL_PATH + '/repos.html',
        reloadOnSearch : false,
        resolve : {
          users : function(ghUsers) {
            return ghUsers();
          },
          repos : function(ghRepos) {
            return ghRepos('angular');
          }
        }
      })
      .when('/gists',{
        controller : 'GistsCtrl',
        templateUrl : TPL_PATH + '/gists.html',
        reloadOnSearch : false,
        resolve : {
          gists : function(ghGists) {
            return ghGists();
          }
        }
      })
      .when('/repo/:owner/:repo',{
        controller : 'RepoCtrl',
        templateUrl : TPL_PATH + '/repo.html',
        reloadOnSearch : false,
        resolve : {
          repoData : function($location, ghRepo) {
            var params = $location.path().match(/repo\/([^\/]+)\/([^\/]+)/);
            return ghRepo(params[1], params[2]);
          }
        }
      })
  })

  .run(function($rootScope, $animate) {
    $rootScope.animationsDisabled = false;
    $rootScope.toggleAnimations = function() {
      $rootScope.animationsDisabled = $animate.enabled();
      $animate.enabled()
          ? $animate.enabled(false)
          : $animate.enabled(true);
    }
  })

  .controller('StatusCtrl', function($scope) {
    $scope.$on('ghRateLimitExceeded', function() {
      $scope.rateExceeded = true;
    });
    $scope.$on('ghRequestSuccess', function() {
      $scope.rateExceeded = false;
    });
  })

  .controller('StageCtrl', function($scope, $rootScope, $anchorScroll) {
    $rootScope.$on('loadingStart', function() {
      $anchorScroll();
      $scope.loadingRoute = true;
    });
    $rootScope.$on('$routeChangeStart', function() {
      $anchorScroll();
      $scope.loadingRoute = true;
    });
    $rootScope.$on('loadingEnd', function() {
      $scope.loadingRoute = false;
    });
    $rootScope.$on('$routeChangeSuccess', function() {
      $scope.loadingRoute = false;
    });
  })

  .controller('SearchCtrl', function($location, $scope, $timeout) {
    var VALID_INPUT_WAIT_DELAY = 200;

    var searchTimer;
    $scope.search = function(q) {
      searchTimer && $timeout.cancel(searchTimer);
      searchTimer = $timeout(function() { 
        $location.path('/').search({
          q : q
        });
      }, VALID_INPUT_WAIT_DELAY);
    };

    $scope.$on('titleChange', function(event, text, isSearch) {
      $scope.isSearch = true;
      $scope.q = text;
    });
  })

  .controller('CollaboratorsCtrl', function($scope) {
    $scope.getClass = function(user, search) {
      return !search || search.length == 0 || user.login.indexOf(search) >= 0 ?
        'selected' :
        'other';
    }
  })

  .controller('RepoCtrl', function($scope, $rootScope, repoData, ghRepoCollaborators, ghRepoCommits, ghRepoReadme, ghRepoPullRequests, ghRepoIssues) {
    $scope.repo = repoData;

    $rootScope.$broadcast('titleChange', repoData.full_name);

    $scope.issuesOrPullRequests = function(type) {
      return type == 'issues' ?
        $scope.issues : 
        $scope.pullRequests;
    };

    ghRepoCollaborators(repoData.owner.login, repoData.name).then(function(items) {
      $scope.collaborators = items;
    });

    ghRepoCommits(repoData.owner.login, repoData.name).then(function(commits) {
      $scope.commits = commits;
    });

    ghRepoReadme(repoData.owner.login, repoData.name).then(function(readme) {
      $scope.readme = readme;
    });

    ghRepoPullRequests(repoData.owner.login, repoData.name).then(function(data) {
      $scope.pullRequests = data;
    });

    ghRepoIssues(repoData.owner.login, repoData.name).then(function(data) {
      $scope.issues = data;
    });

    $scope.repoUrl = function(path) {
      return 'repo/' + $scope.repo.full_name + path;
    };
  })

  .factory('parameterize', function() {
    return function(text) {
      return text.replace(/[^-\w]/g,'-');
    }
  })

  .directive('panel', ['$animate', function($animate) {
    return {
      restrict : 'E',
      link : function($scope, element) {
        var trigger = element.find('[panel-trigger]');
        var content = element.find('[panel-content]');
        var clicked = false;
        trigger.on('click', function() {
          clicked =! clicked;
          clicked
              ? $animate.addClass(content, 'hidden')
              : $animate.removeClass(content, 'hidden');
        });
      }
    }
  }])

  .controller('GistsCtrl', function($scope, gists) {
    $scope.gists = gists;
  })

  .filter('prettify', function($window, $sce) {
    return function(code) {
      var html = $window.prettyPrintOne(code);
      return $sce.trustAsHtml(html);
    }
  })

  .controller('GistListCtrl', function($scope, ghGist, $rootScope) {
    var activeGist;
    $scope.setActiveGist = function(gistRecord) {
      $rootScope.$broadcast('loadingStart');
      ghGist(gistRecord.id).then(function(gist) {
        $rootScope.$broadcast('loadingEnd');
        activeGist = gist;
      });
    };
    $scope.getActiveGist = function() {
      return activeGist;
    };
  })

  .value('firstValue', function(collection) {
    if(angular.isArray(collection)) {
      return collection[0];
    } else {
      for(var i in collection) {
        return collection[i];
      }
    }
  })

  .controller('GistCtrl', function($scope, firstValue) {
    $scope.item = $scope.getActiveGist();
    $scope.activeFile = firstValue($scope.item.files);
    $scope.setActiveFile = function(file) {
      $scope.activeFile = file;
    };
    $scope.getActiveFile = function() {
      return $scope.activeFile;
    }
  })

  .directive('appCarousel', function($animate) {
    return {
      priority: 1000,
      terminal : true,
      transclude: 'element',
      compile : function($element, attrs) {
        var expr = attrs.appCarousel;
        return function(scope, $element, attrs, ctrl, transFn) {
          var activeElement, activeScope;
          scope.$watch(expr, function(newItem, oldItem) {
            var newScope = scope.$new();
            newScope.item = newItem;

            transFn(newScope, function(clone) {
              if(activeScope) {
                activeScope.$destroy();
              } 
              activeScope = newScope;

              if(activeElement) {
                $animate.leave(activeElement);
              }
              activeElement = clone;

              $animate.enter(clone, null, $element);
            });
          });
        }
      }
    };
  })

  .controller('ReposCtrl', function($scope, $rootScope, $location, ghRepos, $routeParams, users, repos) {

    $scope.users = users;
    $scope.repos = repos; 

    $scope.searchRepos = function(q) {
      $scope.repos = [];
      $rootScope.$broadcast('loadingStart');
      ghRepos(q).then(function(items) {
        $scope.repos = items;
        $rootScope.$broadcast('loadingEnd');
      });
    };

    var i = 0, formerSearch;
    $scope.$watch(
      function() { return $location.search().q; },
      function(q,v) {
        if(i++ == 0 || formerSearch == q) return;
        formerSearch = q || formerSearch;
        $scope.searchRepos(formerSearch);
        $rootScope.$broadcast('titleChange', q, true);
      });
  });
