<template>
    <section>
        <h1>Logging you in...</h1>
    </section>
</template>

<script>
/* global window */
export default {
  mounted() {
    window.location.href =
      "https://discordapp.com/oauth2/authorize" +
      "?client_id=453716817639243779" +
      "&scope=identify" +
      "&response_type=code" +
      "&redirect_uri=" +
      encodeURIComponent("beta.blargbot.xyz/callback");
  }
};
</script>
