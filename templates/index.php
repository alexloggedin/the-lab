<?php
if ($_['vite_dev']) {
  $nonce = \OC::$server->getContentSecurityPolicyNonceManager()->getNonce();
} else {
  \OCP\Util::addScript('thevault', 'thevault');
  \OCP\Util::addStyle('thevault', 'thevault');
}
?>

<div id="app">
    <div id="vault-root"
      <?php if (!empty($_['share_token'])): ?>
        data-share-token="<?php p($_['share_token']) ?>"
      <?php endif; ?>
    ></div>
</div>

<?php if ($_['vite_dev']): ?>
  <script type="module" nonce="<?php p($nonce) ?>">
    import RefreshRuntime from 'http://localhost:5173/@react-refresh'
    RefreshRuntime.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => {}
    window.$RefreshSig$ = () => (type) => type
    window.__vite_plugin_react_preamble_installed__ = true
  </script>
  <script type="module" nonce="<?php p($nonce) ?>" src="http://localhost:5173/@vite/client"></script>
  <script type="module" nonce="<?php p($nonce) ?>" src="http://localhost:5173/src/main.jsx"></script>
<?php endif; ?>