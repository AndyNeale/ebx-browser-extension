/**
 * Get the URL of the current active tab
 *
 * @param {function(string)} callback - called when the URL of the current tab is found
 */

function getCurrentTabUrl(callback) {
  // Query filter to be passed to chrome.tabs.query
  var queryInfo = {
    active: true,
    currentWindow: true
  };
  // Search for tabs matching the specified criteria
  chrome.tabs.query(queryInfo, function(tabs) {
    // Extract and return tab URL
    callback(tabs[0].url);
  });
}

function ebxGetAccountId(callback) {
  ebxGetCookie('accountId', callback);
}

function ebxGetAuthToken(callback) {
  ebxGetCookie('authToken', callback);
}

function ebxGetCookie(name, callback) {
  // Attempt to locate specified Echobox cookie
  chrome.cookies.getAll({ 'name': 'echobox.' + name, 'domain': 'echoboxapp.com' }, function (cookies) {
    if (cookies.length === 0) {
      // Cookie not found - return undefined
      callback();
    } else {
      // Cookie found - return cookie value
      callback(cookies[0].value);
    }
  });
}

function ebxGetAccountInfo(accountId, authToken, callback) {
  // Return account info for the specified account
  accountId = [].concat(accountId); // Cooerce accountId into an array due to weird endpoint
  var api = 'https://secure.echoboxapp.com/api/account'; // TODO - set this somewhere else
  $.ajax({
    type: 'GET',
    url: api,
    cache: false,
    data: {
      authToken: authToken, // TODO - set somewhere else e.g. in local storage on background page (when we have one)
      accountIds: accountId
    },
    success: callback,
    error: function (xhr, status, errorThrown) {
      console.log(xhr);
    }
  });
}

function ebxGetPageInfo(url, authToken, callback) {
  // Scrape page info for the specified URL
  var api = 'https://secure.echoboxapp.com/api/urlinfo'; // TODO - set this somewhere else
  $.ajax({
    type: 'GET',
    url: api,
    cache: false,
    data: {
      authToken: authToken, // TODO - set somewhere else e.g. in local storage on background page (when we have one)
      longURL: url
    },
    success: callback,
    error: function (xhr, status, errorThrown) {
      renderError('Something went wrong');
    }
  });
}

function renderContent(contentText) {
  $('.content').html(contentText);
}

function renderError(errorMessage) {
  renderTitle('Error');
  renderContent('<div>' + errorMessage + '</div>');
}

function renderLoading() {
  renderTitle('Loading extension...');
  renderContent('\
<div class="loading">\
  <img src="icons/icon-48.png">\
</div>\
  ');
  var interval = 1000;
  setInterval(function () {
    $('.loading img').fadeOut(interval / 2).fadeIn(interval / 2);
  }, interval);
}

function renderSelectNetwork(authToken, pageInfo, accountApiList) {
  renderTitle('Select Network(s)');
  var selectNetwork = '\
<div>Share this article to the following network(s):</div>\
<form>';
  var accountApi, i;
  for (i = 0; i < accountApiList.length; i++) {
    accountApi = accountApiList[i];
    selectNetwork += '\
<input name="accountApiId" type="checkbox" value="' + accountApi.accountApiId + '"> ' + accountApi.apiPostName + '<br>\
    ';
  }
  selectNetwork += '\
<div class="button-list">\
<a class="button submit" href="#">Schedule</a>\
<a class="button cancel" href="#">Cancel</a>\
</div>\
</form>\
  ';
  renderContent(selectNetwork);
  $('.submit').unbind();
  $('.submit').on('click', function () {
    alert('Hang on, I haven\'t build this bit yet!');
  });
  $('.cancel').unbind();
  $('.cancel').on('click', function () {
    window.close();
  });
}

function renderTitle(titleText) {
  $('.title').html(titleText);
}

document.addEventListener('DOMContentLoaded', function() {
  renderLoading();
  ebxGetAuthToken(function (authToken) {
    if (authToken) {
      getCurrentTabUrl(function (url) {
        renderTitle('Getting page info...');
        ebxGetPageInfo(url, authToken, function (pageInfo) {
          ebxGetAccountId(function (accountId) {
            renderTitle('Getting account info...');
            ebxGetAccountInfo(accountId, authToken, function (accountDetails) {
              var accountInfo = accountDetails.entries[0];
              if (accountInfo.accountStateId !== 3) {
                renderError('<div>Account not active</div>');
                return;
              }
              var accountApiList = [], i, accountApi;
              for (i = 0; i< accountInfo.accountApi.length; i++) {
                accountApi = accountInfo.accountApi[i];
                if ((accountApi.apiTypeId === 2 || accountApi.apiTypeId === 3) && accountApi.apiStateId === 1) {
                  accountApiList.push({
                    accountApiId: accountApi.accountApiId,
                    apiTypeId: accountApi.apiTypeId,
                    apiPostName: accountApi.apiPostName,
                    apiPostImage: accountApi.apiPostImage
                  });
                }
              }
              if (accountApiList.length === 0) {
                renderError('<div>No active networks</div>');
              }
              renderSelectNetwork(authToken, pageInfo, accountApiList);
            });
          });
        });
      });
    } else {
      renderError('You are not logged into Echobox');
    }
  })
});
