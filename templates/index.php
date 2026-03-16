<?php /** @var bool $vite_dev */ ?>
<script nonce="<?php p(\OC_Util::getNonce()); ?>">
  window._nc_base = <?php echo json_encode(\OC::$WEBROOT); ?>;
</script>
<?php if ($vite_dev): ?>
  <script type="module"
          src="http://localhost:5173/src/main.jsx"
          nonce="<?php p(\OC_Util::getNonce()); ?>">
  </script>
<?php else: ?>
  <link rel="stylesheet" href="<?php p(\OCP\Util::linkTo('thelab', 'css/thelab.css')); ?>">
  <script type="module"
          src="<?php p(\OCP\Util::linkTo('thelab', 'js/thelab.js')); ?>"
          nonce="<?php p(\OC_Util::getNonce()); ?>">
  </script>
<?php endif; ?>

<div id="thelab-root"></div>