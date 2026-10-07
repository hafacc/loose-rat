<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import DialectMenu from "./components/dialect-menu.svelte";
  import Rat from "./components/rat.svelte";
  import Search from "./components/search.svelte";
  import { ALL_DIALECTS } from "./lib/dialect-groups.ts";

  const DIALECT_KEY = "dialects";

  function storedDialects(): string[] {
    let stored: unknown;
    try {
      stored = JSON.parse(localStorage.getItem(DIALECT_KEY) ?? "[]");
    } catch {
      stored = [];
    }
    return Array.isArray(stored)
      ? stored.filter((dialect) => ALL_DIALECTS.includes(dialect))
      : [];
  }

  const dialects = new SvelteSet<string>(storedDialects());
  $effect(() => {
    localStorage.setItem(DIALECT_KEY, JSON.stringify([...dialects]));
  });

  let menuOpen = $state(false);

  function openMenu(): void {
    menuOpen = true;
  }
</script>

<main class="mx-auto flex h-full max-w-lg flex-col gap-y-2 p-4">
  <header class="flex items-center gap-x-2">
    <Rat class="size-7" />
    <h1 class="font-extrabold text-2xl">Loose RAT Helper</h1>
  </header>
  <Search {dialects} paused={menuOpen}>
    <button
      type="button"
      class="relative grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
      aria-label="Dialect Choices"
      onclick={openMenu}
    >
      {#if dialects.size > 0}
        <span
          class="-top-1.5 -right-1.5 absolute rounded-full bg-badge px-1.5 font-bold text-badge-foreground text-xs tabular-nums"
        >
          {dialects.size}
        </span>
      {/if}
      <svg
        class="size-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M4 7h9M19 7h1M4 17h1M11 17h9" />
        <circle cx="16" cy="7" r="3" />
        <circle cx="8" cy="17" r="3" />
      </svg>
    </button>
  </Search>
  <DialectMenu bind:open={menuOpen} selected={dialects} />
</main>
