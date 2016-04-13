function render_template(data, target_id, template_id) {
  console.log("Rendering into %s with template %s", target_id, template_id);
  $('#' + target_id).html(Mustache.to_html($('#' + template_id).html(), data));
}

function render_error(error){
  console.error("Error: %s", error);
  $('#flash').addClass('alert-danger');
  $('#flash #text').text(error);
  $('#flash').show();
};

function RestRequest(method, path, max_tries, timeout, api_version, body) {
  api_version = (typeof api_version === 'undefined') ? 1 : api_version;
  return $.ajax({
    method: method,
    url: 'https://api.' + purecloud_session.environment() + '/api/v' + api_version + path,
    headers: {
      'Accept':       'application/json',
      'Content-Type': 'application/json',
    },
    beforeSend: function(xhr) { xhr.setRequestHeader('Authorization', 'bearer ' + purecloud_session.authToken()); },
    timeout: timeout || 5000,
    shouldRetry: max_tries || 5,
    data: (body != null || body != undefined) ? JSON.stringify(body) : null,
  });
}
