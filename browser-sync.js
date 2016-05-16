module.exports = {
  debugInfo: true,
  files: [
    'public/stylesheets/*.css',
    'public/javascripts/*.js',
    'public/images/*',
    'public/favicon.ico',
    'views/**/*.ejs'
  ],
  ghostMode: {
    forms:  true,
    links:  true,
    scroll: true
  },
  proxy: {
    proxy: 'localhost:5000',
    port: 3000,
    notify: true
  }
};
