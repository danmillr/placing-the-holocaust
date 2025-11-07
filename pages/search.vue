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
            <div class="card-row"><span class="label">Country:</span> {{ row.country }}</div>
            <div class="card-row"><span class="label">Experience Group:</span> {{ row.experience_group }}</div>
            <div class="card-row"><span class="label">Score:</span> {{ row.score }}</div>
            <p class="excerpt">{{ row.text }}</p>
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

      // UI label -> Weaviate property mapping
      placeLabelMap: {
        "Regions": "REGION",
        "Countries": "COUNTRY",
        "Populated Places": "POPULATED_PLACE",
        "Environmental Features": "ENV_FEATURES",
        "Distinct Landscape Features": "DLF",
        "Buildings": "BUILDING",
        "Interior Spaces": "INT_SPACE",
        "Spatial Objects": "SPATIAL_OBJECT",
        "Imaginary Places": "NPIP"
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
      this.countries = [...new Set(trimmedCountries)]; // de-dupe (e.g., "Czechoslovakia ")

      // Keep strings (comma-joined options) as-is for the form; where-clause will split properly
      this.experienceGroups = [...new Set(rawExperience.map(e => (e ?? '').toString().trim()))].filter(Boolean);

      // Years as numbers; de-dupe; sort ascending
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

    // Real embedding via the HF Space you provided
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
        // Normalize (optional)
        const norm = Math.sqrt(vec.reduce((s, v) => s + v*v, 0)) || 1;
        return vec.map(v => v / norm);
      } catch (e) {
        console.warn('Embedding fetch failed:', e);
        return null;
      }
    },

    async doWeaviateQuery(formData) {
      const queryText = (formData.queryText || '').trim();

      // Only embed if queryType uses vectors AND there's text
      const wantsVector = (formData.queryType === 'Vector' || formData.queryType === 'Hybrid');
      const queryVector = wantsVector && queryText ? await this.generateEmbedding(queryText) : null;

      const gqlQuery = this.buildGraphQLQuery(formData, queryVector);

      const WEAVIATE_URL = 'http://acg-floating-204-197-5-43.acg.maine.edu:8080/v1/graphql';
      const WEAVIATE_API_KEY = 'wNIf2XunX2THHTK6y1aDEr0lyj0FFv4x6KqT';

      try {
        const resp = await fetch(WEAVIATE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${WEAVIATE_API_KEY}`
          },
          body: JSON.stringify({ query: gqlQuery })
        });
        if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
        const json = await resp.json();
        const testimonies = json.data?.Get?.HolocaustTestimonies || [];
        return testimonies.map(t => {
          if (t._additional?.distance != null) {
            t.score = parseFloat((1 - t._additional.distance).toFixed(3));
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

      // Include nearVector only when we actually have a vector
      const nearVectorClause = (queryVector && queryVector.length)
        ? `nearVector: { vector: [${queryVector.join(',')}] }`
        : '';

      // (Optional) If you later add BM25/hybrid, wire here.
      // For now we stick to vector + filters (or just filters).
      const limit = Number(formData.numResults) || 100;

      return `{
        Get {
          HolocaustTestimonies(
            limit: ${limit},
            ${nearVectorClause}
            ${whereClause}
          ) {
            rg
            full_name
            birth_year
            gender
            country
            experience_group
            text
            _additional { distance }
          }
        }
      }`;
    },

    buildWhereClause(filters) {
      const ops = [];
      const trimOrEmpty = (s) => (s ?? '').toString().trim();
      const isNonEmpty = (s) => trimOrEmpty(s).length > 0;

      // Respect toggles (only apply when sections are enabled)
      const useTestimony = !!filters.testimonyFilters;
      const usePlaces = !!filters.placesHeader;

      // Testimony filters
      if (useTestimony) {
        if (isNonEmpty(filters.gender)) {
          ops.push(`{ operator: Equal, path: ["gender"], valueText: "${trimOrEmpty(filters.gender)}" }`);
        }

        if (isNonEmpty(filters.country)) {
          ops.push(`{ operator: Equal, path: ["country"], valueText: "${trimOrEmpty(filters.country)}" }`);
        }

        if (isNonEmpty(filters.experienceGroup)) {
          const parts = trimOrEmpty(filters.experienceGroup)
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

          if (parts.length > 1) {
            const arr = parts.map(p => `"${p}"`).join(',');
            ops.push(`{ operator: ContainsAll, path: ["experience_group"], valueStringArray: [${arr}] }`);
          } else {
            ops.push(`{ operator: Equal, path: ["experience_group"], valueText: "${parts[0]}" }`);
          }
        }

        if (isNonEmpty(filters.birthYear)) {
          const by = Number(filters.birthYear);
          if (Number.isFinite(by)) {
            // valueNumber works for int/number schemas
            ops.push(`{ operator: Equal, path: ["birth_year"], valueNumber: ${by} }`);
          }
        }

        if (isNonEmpty(filters.rgNumber)) {
          ops.push(`{ operator: Equal, path: ["rg"], valueText: "${trimOrEmpty(filters.rgNumber)}" }`);
        }

        if (isNonEmpty(filters.fullName)) {
          // Exact match; switch to Like for prefix contains if desired
          ops.push(`{ operator: Equal, path: ["full_name"], valueText: "${trimOrEmpty(filters.fullName)}" }`);
        }
      }

      // Place categories (OR block), only if enabled
      if (usePlaces && Array.isArray(filters.labels) && filters.labels.length) {
        const orOps = filters.labels
          .map(lbl => this.placeLabelMap[lbl])
          .filter(Boolean)
          .map(prop => `{ operator: GreaterThan, path: ["${prop}"], valueNumber: 0 }`);
          // If these are booleans in your schema, use:
          // .map(prop => `{ operator: Equal, path: ["${prop}"], valueBoolean: true }`);

        if (orOps.length) {
          ops.push(`{ operator: Or, operands: [${orOps.join(',')}] }`);
        }
      }

      return ops.length ? `where: { operator: And, operands: [${ops.join(',')}] }` : '';
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
