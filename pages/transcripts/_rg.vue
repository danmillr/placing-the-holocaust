<template>
  <div class="transcript-page" v-if="transcript">
    <NuxtLink class="back-link" to="/transcripts">← Back to library</NuxtLink>

    <div class="transcript-container">
      <div class="transcript-info">
        <div class="transcript-metadata">
          <p><b>Name:</b> {{ capitalizeWords(displayName(transcript.interviewee)) || 'Unknown' }}</p>
          <p><b>RG Number:</b> {{ transcript.rg_number }}</p>
          <p v-if="transcript.ushmm_url"><b>URL:</b> <a class="fade" :href="transcript.ushmm_url" target="_blank">{{ transcript.ushmm_url }}</a></p>
          <p v-if="transcript.birth_year"><b>Birth Year:</b> {{ transcript.birth_year }}</p>
          <p v-if="transcript.place_of_birth"><b>Place of Birth:</b> <span style="text-transform: capitalize;">{{ capitalizeWords(transcript.place_of_birth) }}</span></p>
          <p v-if="transcript.country"><b>Country:</b> <span style="text-transform: capitalize;">{{ capitalizeWords(transcript.country) }}</span></p>
          <p v-if="transcript.experience_group"><b>Experience Group:</b> <span style="text-transform: capitalize;">{{ capitalizeWords(transcript.experience_group) }}</span></p>
          <p v-if="transcript.gender"><b>Gender:</b> {{ capitalizeWords(transcript.gender) }}</p>
        </div>

        <div class="transcript-categories" v-if="categoryEntries.length">
          <div
            v-for="cat in categoryEntries"
            :key="cat.key"
            class="category stack"
          >
            <p class="category-header" :class="cat.key" @click="toggleCategory(cat.key)">
              <span class="header-text">{{ cat.label }}</span>
              <span class="caret" :class="{ 'rotate-caret': isCategoryCollapsed(cat.key) }">▶</span>
            </p>
            <ul :class="isCategoryCollapsed(cat.key) ? 'hide-content' : 'show-content'">
              <li v-for="value in cat.values" :key="value">{{ capitalizeWords(value) }}</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="transcript-content">
        <div ref="transcriptBody" class="transcript-body transcript" v-html="htmlContent"></div>
      </div>
    </div>
  </div>

  <div v-else class="transcript-page">
    <NuxtLink class="back-link" to="/transcripts">← Back to library</NuxtLink>
    <p v-if="manifestError">Transcript data is unavailable right now. Please check your connection and try again.</p>
    <p v-else>We couldn’t find that transcript.</p>
  </div>
</template>

<script>
import { getTranscriptsManifest } from '@/utils/transcripts';

const CATEGORY_LABELS = {
  REGION: 'Regions',
  COUNTRY: 'Countries',
  POPULATED_PLACE: 'Populated places',
  ENV_FEATURES: 'Environmental features',
  DLF: 'Distinct landscape features',
  BUILDING: 'Buildings',
  INT_SPACE: 'Interior spaces',
  SPATIAL_OBJ: 'Spatial objects',
  NPIP: 'Imaginary places'
};

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);

export default {
  name: 'TranscriptDetailPage',
  async asyncData({ params, error }) {
    try {
      const manifest = await getTranscriptsManifest();
      const items = manifest?.items || [];
      const slug = params.rg?.toLowerCase() || '';
      const transcript = items.find((item) => item.slug === slug);
      if (!transcript) {
        return { transcript: null, htmlContent: '', manifestError: false };
      }

      let htmlContent = '';
      if (process.server) {
        const fs = eval('require')('fs');
        const path = eval('require')('path');
        const htmlPath = path.join(process.cwd(), 'static', 'transcript-html', `${transcript.slug}.html`);
        if (fs.existsSync(htmlPath)) {
          htmlContent = fs.readFileSync(htmlPath, 'utf8');
        }
      } else {
        const basePath = process.env.NUXT_PUBLIC_BASE_PATH || '';
        const url = `${basePath}/transcript-html/${transcript.slug}.html`;
        try {
          const response = await fetch(url);
          if (response.ok) {
            htmlContent = await response.text();
          } else {
            console.warn('Transcript HTML not found for', transcript.slug);
          }
        } catch (e) {
          console.warn('Transcript HTML fetch failed for', transcript.slug, e);
        }
      }

      return {
        transcript,
        htmlContent,
        manifestError: false
      };
    } catch (e) {
      console.warn('Failed to load transcript data', e);
      return {
        transcript: null,
        htmlContent: '',
        manifestError: true
      };
    }
  },
  head() {
    const title = this.transcript
      ? `${this.transcript.interviewee || 'Transcript'} · RG ${this.transcript.rg_number}`
      : 'Transcript';
    return {
      title
    };
  },
  data() {
    return {
      transcript: this.transcript || null,
      htmlContent: this.htmlContent || '',
      manifestError: this.manifestError || false,
      collapsedCategories: []
    };
  },
  computed: {
    categoryEntries() {
      if (!this.transcript || !this.transcript.category_summary) return [];
      const entries = Object.entries(this.transcript.category_summary).map(([key, values]) => ({
        key,
        label: CATEGORY_LABELS[key] || key,
        values
      }));
      entries.sort(
        (a, b) => CATEGORY_ORDER.indexOf(a.key) - CATEGORY_ORDER.indexOf(b.key)
      );
      return entries;
    }
  },
  mounted() {
    this.loadClientData();
  },
  watch: {
    '$route.hash'() {
      this.highlightHash();
    }
  },
  methods: {
    displayName(name) {
      const cleaned = (name || '').replace(/\bNone\b/gi, '').replace(/\s+/g, ' ').trim();
      return cleaned;
    },
    capitalizeWords(text) {
      return (text || '')
        .toString()
        .split(' ')
        .map(w => w ? w[0].toUpperCase() + w.slice(1) : '')
        .join(' ')
        .trim();
    },
    toggleCategory(key) {
      if (this.collapsedCategories.includes(key)) {
        this.collapsedCategories = this.collapsedCategories.filter(k => k !== key);
      } else {
        this.collapsedCategories = [...this.collapsedCategories, key];
      }
    },
    isCategoryCollapsed(key) {
      return this.collapsedCategories.includes(key);
    },
    async loadClientData() {
      try {
        // Always fetch manifest + HTML client-side to avoid SSR gaps
        const basePath = process.env.NUXT_PUBLIC_BASE_PATH || '';
        const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
        const prefix = basePath || origin;
        const manifestUrl = `${prefix}/data/transcripts.json`;
        const resp = await fetch(manifestUrl);
        if (resp.ok) {
          const data = await resp.json();
          const items = data?.items || [];
          const slug = this.$route.params.rg?.toLowerCase() || '';
          const transcript = items.find(item => item.slug === slug);
          if (transcript) {
            this.transcript = transcript;
          }
        }

        if (this.transcript) {
          const htmlUrl = `${prefix}/transcript-html/${this.transcript.slug}.html`;
          const htmlResp = await fetch(htmlUrl);
          if (htmlResp.ok) {
            this.htmlContent = await htmlResp.text();
          }
        }
      } catch (e) {
        console.warn('Client transcript fetch failed', e);
      } finally {
        this.$nextTick(() => this.decorateTranscript());
      }
    },
    async loadClientFallback() {
      // If SSR failed to load, try client-side manifest + HTML fetch
      try {
        const basePath = process.env.NUXT_PUBLIC_BASE_PATH || '';
        const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
        const prefix = basePath || origin;
        const manifestUrl = `${prefix}/data/transcripts.json`;
        const resp = await fetch(manifestUrl);
        if (!resp.ok) return;
        const data = await resp.json();
        const items = data?.items || [];
        const slug = this.$route.params.rg?.toLowerCase() || '';
        const transcript = items.find(item => item.slug === slug);
        if (!transcript) return;

        this.transcript = transcript;

        try {
          const htmlUrl = `${prefix}/transcript-html/${transcript.slug}.html`;
          const htmlResp = await fetch(htmlUrl);
          if (htmlResp.ok) {
            this.htmlContent = await htmlResp.text();
          }
        } catch (e) {
          console.warn('Client fallback HTML fetch failed', e);
        }

        this.$nextTick(() => this.decorateTranscript());
      } catch (e) {
        console.warn('Client fallback manifest fetch failed', e);
      }
    },
    decorateTranscript() {
      const altNames = CATEGORY_LABELS;
      const bodyEl = this.$refs.transcriptBody;
      if (!bodyEl) return;

      const spans = bodyEl.querySelectorAll('span');
      spans.forEach((span) => {
        const label = altNames[span.className];
        if (label) {
          span.title = label;
        }
      });

      this.highlightHash();
    },
    highlightHash() {
      if (!process.client || !this.$route.hash) return;
      const id = this.$route.hash.replace('#', '');
      if (!id) return;
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('highlighted');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
};
</script>

<style scoped>
.transcript-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}

.back-link {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  text-decoration: none;
  color: #111;
  font-weight: 600;
  margin-bottom: 1rem;
}

.transcript-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid #e2e2e2;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.meta-line {
  color: #444;
  margin: 0.25rem 0 0;
}

.cta-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.secondary-link {
  border: 1px solid #bbb;
  border-radius: 6px;
  padding: 0.5rem 0.9rem;
  text-decoration: none;
  color: #111;
  font-weight: 600;
}

.transcript-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.transcript-metadata dl {
  display: grid;
  gap: 0.75rem;
}

.transcript-metadata dt {
  font-size: 0.9rem;
  color: #555;
}

.transcript-metadata dd {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111;
}

.transcript-categories .category {
  border: 1px solid #e1e1e1;
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.transcript-categories details {
  cursor: pointer;
}

.transcript-categories summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #111;
  list-style: none;
}

.transcript-categories summary::-webkit-details-marker {
  display: none;
}

.transcript-categories ul {
  margin: 0.75rem 0 0;
  padding-left: 1rem;
  list-style: disc;
  color: #333;
}

.transcript-content {
  border-top: 1px solid #e1e1e1;
  padding-top: 1.5rem;
}

.transcript-body {
  line-height: 1.6;
  color: #111;
}

.transcript-body dialogue {
  display: block;
  margin-bottom: 1rem;
}

.transcript-body dialogue.Question sentence::before {
  content: 'Q: ';
  font-weight: 600;
}

.transcript-body dialogue.Answer sentence::before {
  content: 'A: ';
  font-weight: 600;
}

.transcript-body .highlighted {
  background: yellow;
}
</style>
<style scoped>
.transcript-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}

.back-link {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  text-decoration: none;
  color: #111;
  font-weight: 600;
  margin-bottom: 1rem;
}

.transcript-container {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 1.25rem;
}
.transcript-info {
  grid-column: 1 / span 2;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-self: start;
}
.transcript-content { grid-column: 3 / span 4; }

.transcript-metadata {
  margin-bottom: 1rem;
  font-family: "usual", sans-serif;
  font-weight: 300;
}
.transcript-metadata p { margin: 0 0 0.35rem 0; }
.transcript-metadata a { color: #0a66c2; word-break: break-all; }

.transcript-categories {
  display: inline-grid;
  gap: 0.5rem;
  position: sticky;
  top: 20px;
  width: 100%;
}
.category {
  border-radius: 10px;
  padding: 12px 10px;
  background: #f7f7f7;
  border: 1px solid #e0e0e0;
}
.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 0 6px;
  font-weight: 600;
}
.header-text { flex-grow: 1; text-transform: uppercase; font-size: 0.95rem; }
.caret { transition: transform 0.3s ease; font-size: 0.9rem; }
.rotate-caret { transform: rotate(-90deg); }
.category ul { padding-left: 14px; margin: 6px 0 0 0; }
.category li { font-family: "usual", sans-serif; font-weight: 300; padding: 2px 0; }
.hide-content { display: none; }
.show-content { display: block; }

.transcript-body {
  border: 1px solid #e2e2e2;
  border-radius: 10px;
  padding: 1rem;
  background: #fff;
  line-height: 1.6;
  color: #111;
}
.transcript-body dialogue {
  display: block;
  margin-bottom: 1rem;
}
.transcript-body dialogue.Question sentence::before { content: 'Q: '; font-weight: 600; }
.transcript-body dialogue.Answer sentence::before { content: 'A: '; font-weight: 600; }
.transcript-body .highlighted { background: yellow; }

/* Category colors */
.category-header.REGION { background-color: #B9C2CB; }
.category-header.COUNTRY { background-color: #A9B2A1; }
.category-header.POPULATED_PLACE { background-color: #00bffb; }
.category-header.ENV_FEATURES { background-color: #0CCD42; }
.category-header.DLF { background-color: #FFD337; }
.category-header.BUILDING { background-color: #FF7F08; }
.category-header.INT_SPACE { background-color: #a07ee9; }
.category-header.SPATIAL_OBJ { background-color: #E57DE8; }
.category-header.NPIP { background-color: #FA0048; }
.category-header .header-text { color: #111; }

/* Annotated span colors inside transcript content */
:deep(.transcript-body span.REGION) { background-color: #B9C2CB; border-radius:5px; padding:0 2.5px; }
:deep(.transcript-body span.COUNTRY) { background-color: #A9B2A1; border-radius:5px; padding:0 2.5px; }
:deep(.transcript-body span.POPULATED_PLACE) { background-color: #00bffb; border-radius:5px; padding:0 2.5px; }
:deep(.transcript-body span.ENV_FEATURES) { background-color: #0CCD42; border-radius:5px; padding:0 2.5px; }
:deep(.transcript-body span.DLF) { background-color: #FFD337; border-radius:5px; padding:0 2.5px; }
:deep(.transcript-body span.BUILDING) { background-color: #FF7F08; border-radius:5px; padding:0 2.5px; }
:deep(.transcript-body span.INT_SPACE) { background-color: #a07ee9; border-radius:5px; padding:0 2.5px; }
:deep(.transcript-body span.SPATIAL_OBJ) { background-color: #E57DE8; border-radius:5px; padding:0 2.5px; }
:deep(.transcript-body span.NPIP) { background-color: #FA0048; border-radius:5px; padding:0 2.5px; }
</style>
