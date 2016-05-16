"use strict";

var PureCloud = { version: '0.0.1' }

PureCloud.Session = class Session {
  constructor() {
    this.token     = undefined;
    this.error     = undefined;
    this.state     = undefined;
    this.user      = undefined;
    var region     = 'us';
    this.max_tries = 5;
    this.timeout   = 5000;

    // gather information from the window local storage, then the hash
    if (typeof window != 'undefined') {
      if (window.localStorage && window.localStorage.authtoken && window.localStorage.authtoken !== 'undefined' && window.localStorage.authtoken !== 'null') {
        this.token = window.localStorage.authtoken;
        console.log("Extracted token from local storage: %s", this.token);
      }
      if (window.localStorage && window.localStorage.region && window.localStorage.region !== 'undefined' && window.localStorage.region !== 'null') {
        region = window.localStorage.region;
        console.log("Extracted region from local storage: %s", region);
      }
      if (window.location.hash) {
        var self = this;
        console.groupCollapsed('Analyzing URI fragment');
        window.location.hash.substring(1).split('&').forEach(function(pair) { if (pair.length > 0) {
          var parameter = pair.split('=');
          var value     = parameter.slice(1).join('=') || true;

          console.log("Found parameter: %s = %s", parameter[0], value);
          switch(parameter[0]) {
            case 'access_token': self.token = value; break;
            case 'error':        self.error = value; break;
            case 'state':        self.state = value; break;
            default:             break; // we ignore what we do not follow
          }
        }});
        window.location.hash = '';
        console.groupEnd();
      }
    }
    this._set_urls_from_region(region);
  }

  /**
   * @description Authorizes a client via OAuth with Token Implicit Grant. Cannot be used in node.js
   * @param  {string} client_id    The Client Identifier as defined in /admin/integrations/oauth
   * @param  {string} redirect_uri The authorized URI PureClound should redirect the browser after the authentication.
   * @param  {string} region       The region to authenticate against. Valid values are: 'au', 'ie', 'jp', 'us'. Default Value: 'us'
   * @param  {string} state        an optional object that will be passed to the redirect URL.
   * @return {Promise}             a jQuery Promise object. The done handler will receive the logged user, while the fail handler will receive the PureCloud error
   * @example session.authorize_implicit(client_id, 'http://localhost:3000/').done(function(user) {  }).fail(function(error) { });
   */
  authorize_implicit(client_id, redirect_uri, region, state) {
    var self     = this;
    var deferred = jQuery.Deferred();

    this._set_urls_from_region(region);
    if (this.token) { // verify the token is valid
      console.log("Verifying existing token: %s", this.token);
      this.get('/v1/users/me')
        .done(function(data){
          console.log('  token is valid, storing it');
          // store the token in local storage
          if (window.localStorage) { window.localStorage.authtoken = self.token ; window.localStorage.region = region; }
          self.user  = data;
          self.error = undefined;
          deferred.resolve(data);
        }).fail(function(error){
          console.log('  token is invalid, error: %O', error);
          // empty the token and the local storage
          if (window.localStorage) { window.localStorage.authtoken = undefined ; window.localStorage.region = undefined; }
          self.token = undefined;
          self.error = error;
          deferred.reject(error.responseJSON.message);
        });
    } else {
      var auth_url = this.auth_url + '/authorize'
                     + '?response_type=token'
                     + '&client_id=' + encodeURIComponent(client_id)
                     + '&redirect_uri=' + encodeURIComponent(redirect_uri);

      if (state !== undefined && state !== null && state !== '') { auth_url += '&state=' + encodeURIComponent(state); }
      console.log('Acquiring a token from: %s', auth_url);
      window.location.replace(auth_url);
    }
    return deferred.promise();
  }

  /**
   * @description Authorizes a client via OAuth with Client Credentials.
   * @param  {string} client_id    The Client Identifier as defined in /admin/integrations/oauth
   * @param  {string} secret       The Secret as defined in /admin/integrations/oauth
   * @param  {string} region       The region to authenticate against. Valid values are: 'au', 'ie', 'jp', 'us'. Default Value: 'us'
   * @return {Promise}             a jQuery Promise object.
   * @example session.authorize_credentials(client_id, secret).done(function(data) {  }).fail(function(error) { });
   */
  authorize_credentials(client_id, secret, region) {
    var self     = this;
    var deferred = jQuery.Deferred();

    this._set_urls_from_region(region);
    console.log("Authorizing: %s", client_id);
    jQuery.ajax({
      method:   'POST',
      url:      self.auth_url + '/token',
      async:    false,
      username: client_id,
      password: secret,
      data:     { grant_type: 'client_credentials' }
    }).done(function(data) {
      console.log('  received token: %s', data.access_token);
      self.token = data.access_token;
      self.error = undefined;
      deferred.resolve(data);
    }).fail(function(error) {
      console.log('  authentication error: %O', error);
      self.token = undefined;
      self.error = error;
      deferred.reject(error.responseJSON.message);
    });
    return deferred.promise();
  }

  /**
   * @description Executes a REST request in PureCloud
   * @param  {string} method     The HTTP method to use ('POST', 'GET', 'PUT', 'DELETE', etc)
   * @param  {string} path       The REST Path. e.g.: '/v1/users/me'
   * @param  {integer} timeout   The timeout to execute the request
   * @param  {integer} max_tries How many times the request should be resent to PureCloud
   * @param  {JSON}    body      The body of the REST request as a JSON object
   * @return {Promise}           a jQuery Promise object returned by jQuery.ajax
   * @example session.api_request('GET', '/v1/users/me').done(function(user) { }).fail(function(error) {  });
   */
  api_request(method, path, timeout, max_tries, body) {
    var self = this;

    if (this.api_url == undefined) {
      console.error('PureCloud API URL not properly defined, aborting');
      throw new Error('PureCloudA API URI is undefined');
    }
    console.log("%s: %s%s", method, this.api_url, path);
    console.log("  token: %s", this.token);
    return jQuery.ajax({
      method:  method,
      url:     this.api_url + path,
      headers: {
//        'User-Agent':   'PureCloud JS ' + PureCloud.version,
        'Accept':       'application/json',
        'Content-Type': 'application/json',
      },
      beforeSend:  function(xhr) { xhr.setRequestHeader('Authorization', 'bearer ' + self.token); },
      timeout:     timeout || this.timeout,
      shouldRetry: max_tries || this.max_tries,
      data:        (body != null || body != undefined) ? JSON.stringify(body) : null,
    });
  }

  /**
   * @description shortcut for api_request('POST')
   * @see api_request
   */
  post(path, timeout, max_tries, body) { return this.api_request('POST', path, timeout, max_tries, body); }

  /**
   * @description shortcut for api_request('GET')
   * @see api_request
   */
  get(path, timeout, max_tries) { return this.api_request('GET', path, timeout, max_tries); }

  /**
   * @description shortcut for api_request('PUT')
   * @see api_request
   */
  put(path, timeout, max_tries, body) { return this.api_request('PUT', path, timeout, max_tries, body); }

  /**
   * @description shortcut for api_request('DELETE')
   * @see api_request
   */
  delete(path, timeout, max_tries) { return this.api_request('DELETE', path, timeout, max_tries); }

  /**
   * @description private method: Gets the Top Level domain of a given country.
   *              So far, valid values are: 'au', 'ie', 'jp', 'us'. Default Value: 'us'
   * @param  {string} region The region to authenticate against.
   * @return {string}        the top level domain
   */
  _tld_from_country(region) {
    switch((region || '').toLowerCase()) {
      case 'au': return 'com.au'; break;
      case 'ie': return 'ie';     break;
      case 'jp': return 'jp';     break;
      case 'us': return 'com';    break;
      default:   return 'com';    break;
    };
  }

  /**
   * @description private method: Sets all URLs used to 
   *              So far, valid values are: 'au', 'ie', 'jp', 'us'. Default Value: 'us'
   * @param  {string} region The region to authenticate against.
   */
  _set_urls_from_region(region) {
    this.region     = this._tld_from_country(region);
    this.auth_url   = 'https://login.mypurecloud.' + this.region;
    this.api_url    = 'https://api.mypurecloud.'   + this.region + '/api';
    this.upload_url = 'https://apps.mypurecloud.'  + this.region + '/uploads';
  }
}
