(function () {
  async function postGoogleCredential(credential, redirectTo) {
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Google sign-in failed');
    localStorage.setItem('token', result.token);
    window.location.href = redirectTo;
  }

  function loadGoogleScript() {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) return resolve();
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Google sign-in could not be loaded'));
      document.head.appendChild(script);
    });
  }

  window.initTaskyGoogleAuth = async function ({ containerId, redirectTo = 'dashboard.html' }) {
    const container = document.getElementById(containerId);
    if (!container) return;
    try {
      const response = await fetch('/api/auth/google/config');
      const config = await response.json();
      if (!response.ok) throw new Error(config.error || 'Google sign-in is unavailable');
      await loadGoogleScript();
      google.accounts.id.initialize({
        client_id: config.clientId,
        callback: ({ credential }) => postGoogleCredential(credential, redirectTo)
          .catch((error) => alert(error.message))
      });
      google.accounts.id.renderButton(container, {
        theme: 'outline', size: 'large', width: Math.min(container.clientWidth || 360, 400)
      });
    } catch (error) {
      container.innerHTML = '<p class="text-sm text-gray-500 text-center">Google sign-in is currently unavailable.</p>';
      console.error(error);
    }
  };
})();

