"use strict";

class StateButton {
  constructor(button_id, on_click_callback)
  {
    this.id             = button_id;
    this.click_callback = on_click_callback;
    this.reset_timeout  = 2000;
  }

  initialize() {
    $('#'+ this.id + ' #spinner').hide();
    $('#'+ this.id).attr('data-initial-text', $('#'+ this.id + ' #text').text());
    if (this.click_callback != null && this.click_callback != undefined) {
      $('#'+ this.id).on('click', this.click_callback);
    }
  }

  get id() {
    return this._id;
  }

  set id(value) {
    this._id = value;
  }

  processing() {
    var button_id = this.id;

    $('#'+ button_id).addClass('disabled');
    $('#'+ button_id + ' #text').fadeOut(function(){
      $('#'+ button_id + ' #text').text($('#'+ button_id).attr('data-processing-text')).fadeIn(function(){
        $('#'+ button_id + ' #spinner').show();
      });
    });
  }

  processed() {
    var button_id = this.id;

    $('#'+ button_id + ' #text').fadeOut(function(){
      $('#'+ button_id + ' #text').text($('#'+ button_id).attr('data-processed-text')).fadeIn(function() {
        $('#'+ button_id + ' #spinner').hide();
      });
    });
    setTimeout(function(){
      $('#'+ button_id + ' #text').fadeOut(function(){
        $('#'+ button_id + ' #text').text($('#'+ button_id).attr('data-initial-text')).fadeIn(function(){
          $('#'+ button_id).removeClass('disabled');
        });
      });
    }, this.reset_timeout);
  }
}
