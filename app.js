#!/usr/bin/env node

var app_info     = require('./package.json');
var fs           = require('fs');
var util         = require('util');
var config       = require('nconf');
var gitrev       = require('git-rev');
var debug        = require('debug')('RecordPlayer:server');
var logger       = require('morgan');
var express      = require('express');
var bodyParser   = require('body-parser');
var cookieParser = require('cookie-parser');
var session      = require('express-session');
var engine       = require('ejs-locals');
var favicon      = require('serve-favicon');
var http         = require('http');

/**
 * Create the application.
 */
var app = express();

/**
 * Retrieve the configuration
 *   Order: CLI, Environment, config file, defaults.
 *   Reminder: When running through foreman (nf), the port will be set to 5000 via the environment
 */
config.argv({
  port: { alias: 'p', describe: 'Make the server listen to this port' }
})
.env({ separator: '_', lowerCase: true })
.file({ file: './config.json' })
.defaults({
  port: 3000,
  purecloud: {
    regions: [
      { id: 'au', name: 'Australia', suffix: 'com.au' },
      { id: 'ie', name: 'Ireland',   suffix: 'ie' },
      { id: 'jp', name: 'Japan',     suffix: 'jp' },
      { id: 'us', name: 'US',        suffix: 'com' }
    ],
  },
});

/**
 * Environment and git information
 */
console.log("Version: %s (%s)", app_info.version, app.get('env'));
gitrev.short(function(value)  { app.set('git_commit', value); console.log('Git commit: ' + value); });
gitrev.branch(function(value) { app.set('git_branch', value); console.log('Git branch: ' + value); });
gitrev.tag(function(value)    { app.set('git_tag', value);    console.log('Git tag: '    + value); });

/**
 * Configure the application.
 */
app.set('port', config.get('port'));
app.set('purecloud_regions', config.get('purecloud:regions');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('ejs', engine);

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: 'A42421F7-70D5-4B0C-9013-64D6C19C2C48',
  resave: false,
  saveUninitialized: false
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/bower_components', express.static(path.join(__dirname, '/bower_components')));

/**
 * Configure the routes.
 */

// Common tracing and locals
app.use(function(req, res, next) {
  console.log("%s %s", req.method, req.path);
  console.log('Session id: ' + req.session.id);
  if (req.session.token) { console.log('Session Token: ' + req.session.token); }
  if (req.session.user)  { console.log('Session user:  ' + req.session.user.username); }
  res.locals.purecloud_organizations = app.get('organizations');
  res.locals.purecloud_token         = req.session.token;
  res.locals.current_user            = req.session.user;
  res.locals.git_commit              = git_commit;
  res.locals.git_branch              = git_branch;
  res.locals.app_version             = package_info.version;
  next();
});

// Application routes
app.use('/', require('./routes/index'));

// Error routes
app.use(function(req, res, next) { // catch 404 and forward to error handler
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) { // development error handler (with stacktrace)
    res.status(err.status || 500);
    res.render('error', { message: err.message, error: err });
  });
} else {
  app.use(function(err, req, res, next) { // production error handler (without stacktraces)
    res.status(err.status || 500);
    res.render('error', { message: err.message, error: {} });
  });
}

/**
 * Create HTTP server.
 */
app.set('server', app.listen(config.get('port'), function(){
  console.log("Listening on port %s", config.get('port'));
}));

// Expose app
exports = module.exports = app;
