<template>
  <div class="transcript-page" v-if="transcript">
    <NuxtLink class="back-link" to="/transcripts">← Back to library</NuxtLink>

    <div class="transcript-heading">
      <div>
        <p class="eyebrow">RG {{ transcript.rg_number }}</p>
        <h1>{{ transcript.interviewee || 'Interview transcript' }}</h1>
        <p class="meta-line">
          <span v-if="transcript.place_of_birth">Born in {{ transcript.place_of_birth }}</span>
          <span v-if="transcript.country">({{ transcript.country }})</span>
          <span v-if="transcript.birth_year">· {{ transcript.birth_year }}</span>
        </p>
      </div>
      <div class="cta-row">
        <a v-if="transcript.ushmm_url" :href="transcript.ushmm_url" target="_blank" rel="noopener" class="secondary-link">
          View on USHMM
        </a>
        <a v-if="transcript.pdf_url" :href="transcript.pdf_url" target="_blank" rel="noopener" class="secondary-link">
          Download PDF
        </a>
      </div>
    </div>

    <section class="transcript-info">
      <div class="transcript-metadata">
        <dl>
          <div>
            <dt>Name</dt>
            <dd>{{ transcript.interviewee || 'Unknown' }}</dd>
          </div>
          <div>
            <dt>RG number</dt>
            <dd>{{ transcript.rg_number }}</dd>
          </div>
          <div v-if="transcript.birth_date">
            <dt>Birth date</dt>
            <dd>{{ transcript.birth_date }}</dd>
          </div>
          <div v-if="transcript.experience_group">
            <dt>Experience group</dt>
            <dd>{{ transcript.experience_group }}</dd>
          </div>
          <div v-if="transcript.gender">
            <dt>Gender</dt>
            <dd>{{ transcript.gender }}</dd>
          </div>
        </dl>
      </div>
      <div class="transcript-categories" v-if="categoryEntries.length">
        <div
          v-for="cat in categoryEntries"
          :key="cat.key"
          class="category"
        >
          <details open>
            <summary>
              <span>{{ cat.label }}</span>
              <span class="count">{{ cat.values.length }}</span>
            </summary>
            <ul>
              <li v-for="value in cat.values" :key="value">{{ value }}</li>
            </ul>
          </details>
        </div>
      </div>
    </section>

    <section class="transcript-content">
      <div ref="transcriptBody" class="transcript-body" v-html="htmlContent"></div>
    </section>
  </div>

  <div v-else class="transcript-page">
    <NuxtLink class="back-link" to="/transcripts">← Back to library</NuxtLink>
    <p>We couldn’t find that transcript.</p>
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
    const manifest = await getTranscriptsManifest();
    const items = manifest?.items || [];
    const slug = params.rg?.toLowerCase() || '';
    const transcript = items.find((item) => item.slug === slug);
    if (!transcript) {
      error({ statusCode: 404, message: 'Transcript not found' });
      return {};
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
      const response = await fetch(`${basePath}/transcript-html/${transcript.slug}.html`);
      if (response.ok) {
        htmlContent = await response.text();
      } else {
        console.warn('Transcript HTML not found for', transcript.slug);
      }
    }

    return {
      transcript,
      htmlContent
    };
  },
  head() {
    const title = this.transcript
      ? `${this.transcript.interviewee || 'Transcript'} · RG ${this.transcript.rg_number}`
      : 'Transcript';
    return {
      title
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
    this.decorateTranscript();
  },
  watch: {
    '$route.hash'() {
      this.highlightHash();
    }
  },
  methods: {
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
