<script lang="ts">
  import { onDestroy, type Snippet } from "svelte";
  import type { SvelteSet } from "svelte/reactivity";
  // imported here rather than by the worker so the offline copy of the site includes it
  import wordsUrl from "../data/words.txt?url";
  import type { EntryData, Query, Result } from "../lib/types";
  import Entry from "./entry.svelte";

  // rows drawn at first, and added each time the list is scrolled to its end
  const PAGE = 60;

  const {
    dialects,
    paused,
    children,
  }: {
    /** selected dialect keys */
    dialects: SvelteSet<string>;
    /** whether to hold searches back, while the selection is being changed */
    paused: boolean;
    /** controls shown beside the search box */
    children: Snippet;
  } = $props();

  let search = $state("");
  let ipa = $state("");
  let results = $state.raw<readonly EntryData[]>([]);
  let unknown = $state.raw<readonly string[]>([]);

  // rows are drawn a page at a time, since a thousand at once stalls typing
  let drawn = $state(PAGE);
  let list = $state<HTMLElement>();
  let more = $state<HTMLElement>();
  $effect(() => {
    if (list && more) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            drawn += PAGE;
          }
        },
        { root: list, rootMargin: "800px" },
      );
      observer.observe(more);
      return () => observer.disconnect();
    }
  });
  let searching = $state(false);
  let failed = $state(false);

  // iOS doesn't shrink the layout for its keyboard, so track the visible area by hand
  $effect(() => {
    const { visualViewport } = globalThis;
    function resize(): void {
      document.body.style.height = `${visualViewport?.height}px`;
    }
    visualViewport?.addEventListener("resize", resize);
    return () => visualViewport?.removeEventListener("resize", resize);
  });

  let latest: Query = { id: 0, dialects: [], query: "", words: wordsUrl };
  // started by the first search, since only a browser has workers
  let worker: Worker | undefined;
  onDestroy(() => worker?.terminate());

  function spawnWorker(): Worker {
    const spawned = new Worker(new URL("../lib/worker.ts", import.meta.url), {
      type: "module",
    });
    spawned.addEventListener("message", onResult);
    spawned.addEventListener("error", onFailure);
    spawned.addEventListener("messageerror", onFailure);
    return spawned;
  }

  // a dead worker keeps its failed word-list load, so recovery means a fresh one;
  // respawn without reposting so a broken worker can't loop, the next query retries
  function onFailure(): void {
    searching = false;
    failed = true;
    worker?.terminate();
    worker = spawnWorker();
  }

  function onResult(event: MessageEvent<Result>): void {
    const result = event.data;
    if (result.id === latest.id) {
      searching = false;
      if (result.error === undefined) {
        ({ results, ipa, unknown } = result);
        drawn = PAGE;
      } else {
        onFailure();
      }
    }
  }

  $effect(() => {
    if (!paused) {
      latest = {
        ...latest,
        id: latest.id + 1,
        dialects: [...dialects],
        query: search,
      };
      failed = false;
      searching = true;
      worker ??= spawnWorker();
      worker.postMessage(latest);
    }
  });

  function blurOnEnter(event: KeyboardEvent): void {
    if (event.key === "Enter" && event.target instanceof HTMLElement) {
      event.target.blur();
    }
  }
</script>

<div class="flex grow basis-0 flex-col gap-y-3 text-lg">
  <div
    class="flex grow basis-0 flex-col-reverse gap-y-2.5 overflow-y-auto overscroll-none pr-1 pb-1"
    bind:this={list}
  >
    {#each results.slice(0, drawn) as result (result.word)}
      <Entry {...result} />
    {/each}
    <div bind:this={more}></div>
  </div>
  {#if search.trim() === ""}
    <p class="font-medium">Find words for a loose Remote Associates Test</p>
  {/if}
  {#if unknown[0] !== undefined}
    <p class="font-medium">“{unknown[0]}” isn't in the word list</p>
  {/if}
  <div class="flex items-center gap-x-2.5 pb-1">
    <div
      class="flex min-w-0 grow items-baseline gap-x-2 rounded-full bg-card px-5 py-2.5 text-card-foreground shadow-hard outline-offset-2 focus-within:outline-2"
    >
      <input
        class="min-w-0 grow bg-transparent font-bold text-xl outline-none placeholder:font-medium placeholder:text-card-foreground/60"
        bind:value={search}
        onkeydown={blurOnEnter}
        placeholder="enter word..."
      >
      {#if failed}
        <span
          class="text-destructive text-sm"
          title="search failed — keep typing to retry"
        >
          error
        </span>
      {:else if searching}
        <svg
          class="size-4 animate-spin self-center"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M8 2a6 6 0 1 0 6 6" />
        </svg>
      {:else}
        <span class="text-card-foreground/60 text-sm">{ipa}</span>
      {/if}
    </div>
    {@render children()}
  </div>
</div>
