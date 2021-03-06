var minihash = require('minihash');
var miniroutes = require('miniroutes');

function ensureReady(vm, cb) {
  return cb();
}

function createLog(debug) {
  return function() {
    if (debug) console.log.apply(console, [].slice.call(arguments));
  }
}

function routesEqual(route1, route2) {
  if (!(route1 && route2) ||
    route1.name !== route2.name ||
    route1.params.length !== route2.params.length ||
    route1.path !== route2.path) {
    return false;
  }
  for (var i = route1.params.length - 1; i >= 0; i--) {
    if (route1.params[i] !== route2.params[i]) return false;
  }
  return true;
}

function initRoot(vm, routes, options) {
  var currentRoute = null;
  var hash = null;
  var log = createLog(options.debug);

  // Routing mechanism
  hash = minihash(options.prefix, miniroutes(routes, function(route, previous) {
    log('hash->route received', route);
    ensureReady(vm, function() {
      if (!currentRoute || !routesEqual(currentRoute, route)) {
        // leave
        if (previous && previous.name !== route.name) {
          log('emits a lanes:leave:<route_name> event', previous);
          vm.$emit('lanes:leave:' + previous.name, previous);
          vm.$broadcast('lanes:leave:' + previous.name, previous);
        }
        // update
        log('emits a lanes:update:<route_name> event', route);
        vm.$emit('lanes:update:' + route.name, route);
        vm.$broadcast('lanes:update:' + route.name, route);
        // route
        log('emits a lanes:route event', route);
        vm.$emit('lanes:route', route);
      }
    });
  }));


  // Update the current path on update event
  vm.$on('lanes:route', function(route) {
    log('lanes:route received', route);
    currentRoute = route;
    vm.$broadcast('lanes:route', route);
  });

  // New path received: update the hash value (triggers a route update)
  vm.$on('lanes:path', function(path) {
    log('lanes:path received', path);
    ensureReady(vm, function() {
      log('change the hash value', path);
      hash.value = path;
    });
  });

  vm.$on('hook:beforeDestroy', function() {
    hash.stop();
  });
}

function makeRoutes(routes) {
  if (Array.isArray(routes)) return routes;
  if (typeof routes !== 'function') return [];
  var finalRoutes = [];
  routes(function(name, re) {
    finalRoutes.push([name, re]);
  });
  return finalRoutes;
}

module.exports = function(Vue, options) {
  return Vue.extend({
    ready: function() {
      if (this.$root === this) {
        initRoot(this, makeRoutes(options.routes), {
          prefix: options.prefix || '',
          debug: options.debug || false
        });
      }
    }
  });
};
