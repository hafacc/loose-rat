<script lang="ts">
  import "../app.css";
  import fontUrl from "@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2?url";
  import type { Snippet } from "svelte";

  const { children }: { children: Snippet } = $props();
</script>

<svelte:head>
  <link
    rel="preload"
    as="font"
    type="font/woff2"
    crossorigin="anonymous"
    href={fontUrl}
  >
</svelte:head>

{@render children()}
