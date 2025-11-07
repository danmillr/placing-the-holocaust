<template>
  <div class="search-page layout-with-sidebar">
    <!-- Sidebar: Search Filters -->
    <aside class="left-sidebar">
      <h2 class="sidebar-title">Search Menu</h2>

      <div v-if="loading" class="loading-indicator">
        Loading filter data...
      </div>

      <SearchForm
        v-else
        :genders="genders"
        :countries="countries"
        :experienceGroups="experienceGroups"
        :birthYears="birthYears"
        :placeLabelOptions="placeLabelOptions"
        @search-submitted="onSearchFormSubmitted"
      />
    </aside>

    <!-- Main Content: Results -->
    <main class="content-area">
      <h1 class="page-heading">Search Transcripts</h1>

      <div class="test-controls">
        <button type="button" @click="runAggregateTest">Run Count Test</button>
        <div class="rg-test">
          <input
            v-model="testRg"
            type="text"
            placeholder="Enter RG for sample test"
          />
          <button type="button" @click="runSampleRGTest">Run RG Test</button>
        </div>
      </div>

      <div v-if="results.length" class="results-list">
        <h2 class="results-count">Results ({{ results.length }})</h2>
        <div v-for="(row, idx) in results" :key="idx" class="result-card">
          <div class="card-header">
            <strong>{{ row.full_name }}</strong>
            <span class="rg-label">RG: {{ row.rg }}</span>
          </div>
          <div class="card-body">
            <div class="card-row"><span class="label">Birth Year:</span> {{ row.birth_year }}</div>
            <div class="card-row"><span class="label">Gender:</span> {{ row.gender }}</div>
            <div class="card-row"><span class="label">Country:</span> {{ row.birth_country }}</div>
            <div class="card-row"><span class="label">Experience Group:</span> {{ row.experience_group }}</div>
            <div class="card-row"><span class="label">Score:</span> {{ row.score }}</div>
            <p class="excerpt">{{ row.text }}</p>
          </div>
          <div class="card-actions">
            <NuxtLink :to="makeTranscriptLink(row)">Open in transcript</NuxtLink>
          </div>
        </div>
      </div>

      <div v-else-if="searched && !results.length" class="no-results">
        <p>No results found.</p>
      </div>
    </main>
  </div>
</template>

<script>
import SearchForm from '@/components/SearchForm.vue'

const escQuotes = (s) => (s || '').toString().replace(/"/g, '\\"');

export default {
  name: "SearchPage",
  components: { SearchForm },
  data() {
    return {
      loading: true,
      searched: false,
      results: [],

      genders: [],
      countries: [],
      experienceGroups: [],
      birthYears: [],
      testRg: '',

      // UI label -> Weaviate property mapping
      placeLabelMap: {
        "Regions": "region",
        "Countries": "country",
        "Populated Places": "populated_place",
        "Environmental Features": "env_features",
        "Distinct Landscape Features": "dlf",
        "Buildings": "building",
        "Interior Spaces": "int_space",
        "Spatial Objects": "spatial_obj",
        "Imaginary Places": "npip"
      },

      placeLabelOptions: [
        { label: "Regions" },
        { label: "Countries" },
        { label: "Populated Places" },
        { label: "Environmental Features" },
        { label: "Distinct Landscape Features" },
        { label: "Buildings" },
        { label: "Interior Spaces" },
        { label: "Spatial Objects" },
        { label: "Imaginary Places" }
      ]
    }
  },

  async created() {
    try {
      const basePath = process.env.NUXT_PUBLIC_BASE_PATH || '';
      const filterPath = `${basePath}/data/filters.json`;
      const resp = await fetch(filterPath);
      const filterData = await resp.json();

      // As-received
      const rawGenders = filterData.genders || [];
      const rawCountries = filterData.countries || [];
      const rawExperience = filterData.experience_groups || [];
      const rawYears = filterData.birth_years || [];

      // Sanitize on load
      this.genders = [...new Set(rawGenders.map(g => (g ?? '').toString().trim()))].filter(Boolean);

      const trimmedCountries = rawCountries.map(c => (c ?? '').toString().trim()).filter(Boolean);
      this.countries = [...new Set(trimmedCountries)];

      this.experienceGroups = [...new Set(rawExperience.map(e => (e ?? '').toString().trim()))].filter(Boolean);

      const yearsNum = rawYears
        .map(y => Number(y))
        .filter(y => Number.isFinite(y))
      this.birthYears = [...new Set(yearsNum)].sort((a,b) => a - b);
    } catch (err) {
      console.error("Failed to load filters.json", err);
    } finally {
      this.loading = false;
    }
  },

  methods: {
    async onSearchFormSubmitted(formData) {
      this.searched = true;
      try {
        const results = await this.doWeaviateQuery(formData);
        this.results = results;
      } catch (err) {
        console.error("Error during Weaviate query:", err);
        this.results = [];
      }
    },

    async generateEmbedding(text) {
      const t = (text || '').trim();
      if (!t) return null;
      try {
        const response = await fetch('https://wjbmattingly-vector-endpoint.hf.space/vectorize', {
          method: 'POST',
          headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: t })
        });
        if (!response.ok) {
          console.warn('Embedding API non-OK:', response.status, await response.text());
          return null;
        }
        const data = await response.json();
        let vec = null;
        if (Array.isArray(data)) vec = data;
        else if (Array.isArray(data?.embedding)) vec = data.embedding;
        else if (Array.isArray(data?.vector)) vec = data.vector;

        if (!vec || !vec.length || !Number.isFinite(vec[0])) {
          console.warn('Unexpected embedding payload:', data);
          return null;
        }
        const norm = Math.sqrt(vec.reduce((s, v) => s + v*v, 0)) || 1;
        return vec.map(v => v / norm);
      } catch (e) {
        console.warn('Embedding fetch failed:', e);
        return null;
      }
    },

    async doWeaviateQuery(formData) {
      const queryText = (formData.queryText || '').trim();
      const wantsVector = (formData.queryType === 'Vector' || formData.queryType === 'Hybrid');
      const queryVector = wantsVector && queryText ? await this.generateEmbedding(queryText) : null;

      const gqlQuery = this.buildGraphQLQuery(formData, queryVector);
      try {
        const json = await this.postWeaviate(gqlQuery);
        const testimonies = json.data?.Get?.HolocaustTestimonies || [];
        return testimonies.map(t => {
          if (t._additional?.distance != null) {
            t.score = Number((1 - t._additional.distance).toFixed(3));
          } else {
            t.score = null;
          }
          return t;
        });
      } catch (err) {
        console.error("Weaviate query error:", err);
        return [];
      }
    },

    buildGraphQLQuery(formData, queryVector) {
      const whereClause = this.buildWhereClause(formData);
      const limit = Number(formData.numResults) || 100;
      const args = [`limit: ${limit}`];
      if (whereClause) args.push(whereClause);

      const queryText = (formData.queryText || '').trim();
      const escaped = escQuotes(queryText);
      const vectorReady = Array.isArray(queryVector) && queryVector.length;

      if (formData.queryType === 'Keyword' && escaped) {
        args.push(`bm25: { query: "${escaped}" }`);
      } else if (formData.queryType === 'Hybrid' && escaped && vectorReady) {
        args.push(`hybrid: { query: "${escaped}", vector: [${queryVector.join(',')}], alpha: 0.5 }`);
      } else if (vectorReady) {
        args.push(`nearVector: { vector: [${queryVector.join(',')}] }`);
      }

      return `{
        Get {
          HolocaustTestimonies(
            ${args.join(',\n            ')}
          ) {
            rg
            full_name
            birth_year
            birth_country
            gender
            experience_group
            sentence_ids
            text
            _additional { id distance }
          }
        }
      }`;
    },

    buildWhereClause(filters) {
      const ops = [];
      const trimOrEmpty = (s) => (s ?? '').toString().trim();
      const isNonEmpty = (s) => trimOrEmpty(s).length > 0;

      const useTestimony = !!filters.testimonyFilters;
      const usePlaces = !!filters.placesHeader;

      if (useTestimony) {
        if (Array.isArray(filters.category) && filters.category.length) {
          const catOps = filters.category
            .map(c => trimOrEmpty(c))
            .filter(Boolean)
            .map(c => `{ operator: Equal, path: ["category"], valueText: "${escQuotes(c)}" }`);
          if (catOps.length === 1) ops.push(catOps[0]);
          else if (catOps.length) ops.push(`{ operator: Or, operands: [${catOps.join(',')}] }`);
        }

        if (isNonEmpty(filters.gender)) {
          ops.push(`{ operator: Equal, path: ["gender"], valueText: "${escQuotes(filters.gender)}" }`);
        }

        if (isNonEmpty(filters.country)) {
          ops.push(`{ operator: Equal, path: ["birth_country"], valueText: "${escQuotes(filters.country)}" }`);
        }

        if (isNonEmpty(filters.experienceGroup)) {
          ops.push(`{ operator: Equal, path: ["experience_group"], valueText: "${escQuotes(filters.experienceGroup)}" }`);
        }

        if (isNonEmpty(filters.birthYear)) {
          const by = Number(filters.birthYear);
          if (Number.isFinite(by)) {
            ops.push(`{ operator: Equal, path: ["birth_year"], valueInt: ${by} }`);
          }
        }

        if (isNonEmpty(filters.rgNumber)) {
          ops.push(`{ operator: Equal, path: ["rg"], valueText: "${escQuotes(filters.rgNumber)}" }`);
        }

        if (isNonEmpty(filters.fullName)) {
          const name = escQuotes(filters.fullName);
          ops.push(`{ operator: Like, path: ["full_name"], valueText: "*${name}*" }`);
        }
      }

      if (usePlaces && Array.isArray(filters.labels) && filters.labels.length) {
        const orOps = filters.labels
          .map(lbl => this.placeLabelMap[lbl])
          .filter(Boolean)
          .map(prop => `{ operator: GreaterThan, path: ["${prop}"], valueNumber: 0 }`);

        if (orOps.length === 1) ops.push(orOps[0]);
        else if (orOps.length) ops.push(`{ operator: Or, operands: [${orOps.join(',')}] }`);
      }

      return ops.length ? `where: { operator: And, operands: [${ops.join(',')}] }` : '';
    },

    makeTranscriptLink(row) {
      const rg = encodeURIComponent(row?.rg || '');
      const sid = encodeURIComponent((row?.sentence_ids && row.sentence_ids[0]) || '');
      return `/transcripts/${rg}?sent=${sid}`;
    },

    async postWeaviate(query) {
      const resp = await fetch('/api/weaviate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
      return resp.json();
    },

    async runAggregateTest() {
      const query = `{ Aggregate { HolocaustTestimonies { meta { count } } } }`;
      try {
        const json = await this.postWeaviate(query);
        console.log('Aggregate test result:', json);
      } catch (err) {
        console.error('Aggregate test failed:', err);
      }
    },

    async runSampleRGTest() {
      const trimmed = (this.testRg || '').trim();
      if (!trimmed) {
        console.warn('Provide an RG value for the test.');
        return;
      }
      const query = `{
        Get {
          HolocaustTestimonies(
            limit: 5,
            where: {
              operator: Equal,
              path: ["rg"],
              valueText: "${escQuotes(trimmed)}"
            }
          ) {
            rg
            full_name
            birth_year
            birth_country
            gender
            experience_group
            sentence_ids
            text
            _additional { id distance }
          }
        }
      }`;
      try {
        const json = await this.postWeaviate(query);
        const testimonies = json.data?.Get?.HolocaustTestimonies || [];
        this.results = testimonies.map(t => {
          if (t._additional?.distance != null) {
            t.score = Number((1 - t._additional.distance).toFixed(3));
          } else {
            t.score = null;
          }
          return t;
        });
        this.searched = true;
        console.log('RG test result:', testimonies);
      } catch (err) {
        console.error('RG test failed:', err);
      }
    }
  }
}
</script>

<style scoped>
.search-page.layout-with-sidebar {
  display: flex;
  height: calc(100vh - var(--site-header-height, 0px) - var(--site-footer-height, 0px));
  overflow: hidden;
}

.left-sidebar {
  width: 340px;
  padding: var(--space-m, 1rem);
  background: var(--color-bg, #fff);
  border-right: 1px solid var(--color-secondary, #ddd);
  box-shadow: 2px 0 4px rgba(0,0,0,0.1);
  overflow-y: auto;
}

.sidebar-title {
  font-size: var(--font-xl, 1.5rem);
  margin-bottom: var(--space-m, 1rem);
  font-weight: 600;
}

.content-area {
  flex: 1;
  padding: var(--space-m, 1rem);
  overflow-y: auto;
}

.page-heading {
  font-size: var(--font-xl, 1.75rem);
  margin-bottom: var(--space-m, 1rem);
}

.test-controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 0.5rem);
  margin-bottom: var(--space-m, 1rem);
}

.rg-test {
  display: flex;
  gap: var(--space-s, 0.5rem);
  align-items: center;
}

.rg-test input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

/* Card-based results */
.results-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 1rem);
  margin-top: var(--space-l, 2rem);
  overflow-y: auto;
  padding-bottom: var(--space-l, 2rem);
}

.results-count {
  font-size: var(--font-lg, 1.25rem);
  margin-bottom: var(--space-m, 1rem);
}

.result-card {
  background: var(--color-bg, #fff);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  padding: var(--space-m, 1rem);
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-s, 0.5rem);
  font-size: var(--font-lg, 1.25rem);
}

.rg-label {
  font-size: var(--font-base, 1rem);
  color: var(--color-secondary, #666);
}

.card-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-s, 0.5rem);
}

.card-row {
  font-size: var(--font-base, 1rem);
}

.label {
  font-weight: 600;
  margin-right: var(--space-s, 0.5rem);
}

.excerpt {
  grid-column: 1 / -1;
  margin-top: var(--space-m, 1rem);
  font-style: italic;
  color: var(--color-secondary, #666);
}

.card-actions {
  margin-top: var(--space-s, 0.5rem);
  display: flex;
  justify-content: flex-end;
}

.card-actions a {
  color: var(--color-primary, #000);
  text-decoration: underline;
}

.no-results {
  margin-top: var(--space-m, 1rem);
  color: var(--color-secondary, #666);
  font-style: italic;
}

.loading-indicator {
  font-style: italic;
  color: var(--color-secondary, #777);
}
</style>
