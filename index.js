/**
 * Sample response from `/oauth/device/code`:
 * {
 *   "device_code": "Ag_EEG_U-x5FGsQshfpzko1p",
 *   "user_code": "QTZL-MCBW",
 *   "verification_uri": "https://fadydev.auth0.com/activate",
 *   "expires_in": 900,
 *   "interval": 5,
 *   "verification_uri_complete": "https://fadydev.auth0.com/activate?user_code=QTZL-MCBW"
 * }
 */
function requestAuthorization() {
  const config = getConfig()
  let body = {
    client_id: config.clientId
  }

  if (config.audience) {
    body.audience = config.audience
  }

  if (config.scopes.length) {
    body.scope = config.scopes.join(' ')
  }

  fetch(`https://${config.tenant}/oauth/device/code`, {
    method: 'POST',
    body: new URLSearchParams(body),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
    .then((res) => res.json())
    .then((jsonRes) => {
      if (!jsonRes.error) {
        exchangeDeviceCodeForToken(jsonRes)
      } else {
        console.log(jsonRes)
      }
    })
    .catch((err) => {
      console.log(err)
    })
}

/**
 * Poll the `/oauth/token` endpoint to exchange the device code for tokens
 * after the user has successfully authorized the device.
 *
 * @param {Object} deviceCode
 */
function exchangeDeviceCodeForToken(deviceCode) {
  renderStep('exchange', { deviceCode })

  const execExchange = () => {
    const config = getConfig()

    fetch(`https://${config.tenant}/oauth/token`, {
      method: 'POST',
      body: new URLSearchParams({
        client_id: config.clientId,
        device_code: deviceCode.device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
      .then((res) => res.json())
      .then((jsonRes) => {
        setExchangeResponse(jsonRes)

        if (!jsonRes.error) {
          fetchUserInfo(jsonRes)
        } else if (['authorization_pending', 'slow_down'].includes(jsonRes.error)) {
          setTimeout(
            execExchange,
            deviceCode.interval * 1000
          )
        }
      })
      .catch((err) => {
        console.log(err)
      })
  }

  execExchange()
}

/**
 * Retrieve user info from the `/userinfo` endpoint using the `access_token`
 *
 * @param {Object} tokenSet
 */
function fetchUserInfo(tokenSet) {
  const config = getConfig()

  fetch(`https://${config.tenant}/userinfo`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${tokenSet.access_token}`
    }
  })
    .then((res) => res.json())
    .then((jsonRes) => {
      renderStep('complete', { tokenSet, userInfo: jsonRes })
    })
    .catch((err) => {
      console.log(err)
    })
}

// event handlers
document
  .getElementById('authorize-btn')
  .addEventListener('click', requestAuthorization)

document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('configure-section').style.display = 'none'
  renderStep('authorize')
})

renderStep('configure')
