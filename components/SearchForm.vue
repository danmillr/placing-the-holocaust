<template>
  <div :class="['search-form-container', { floating }]">
    <aside :class="['search-panel', { floating }]">
      <h2>Search</h2>

      <form @submit.prevent="submitSearch">
        <!-- Query basics -->
        <details class="dataset-section" open>
          <summary class="section-summary">Query</summary>
          <div class="field-group">
            <label for="qText">Query Text</label>
            <input id="qText" type="text" v-model="queryText" placeholder="Enter your search term" />
          </div>

          <div class="field-group">
            <label for="qType">Type of Search</label>
            <select id="qType" v-model="queryType">
              <option>Vector</option>
              <option>Keyword</option>
              <option>Hybrid</option>
            </select>
          </div>
        </details>

        <hr class="section-divider" />

        <!-- Places -->
        <details class="dataset-section">
          <summary class="section-summary">
            Places Filter
            <span class="summary-switch">
              <input type="checkbox" v-model="togglePlaces" />
            </span>
          </summary>

          <div v-if="togglePlaces" class="dataset-controls">
            <!-- Multi-select (button chips) -->
            <details class="control-collapsible">
              <summary class="control-summary">
                <span class="filter-label">Select Place Labels</span>
                <span class="summary-count">
                  ({{ selectedPlaces.length }}/{{ placeOptions.length }})
                </span>
              </summary>

              <div class="multi-select">
                <div class="multi-buttons">
                  <button
                    v-for="(pl, idx) in placeOptions"
                    :key="idx"
                    type="button"
                    :class="{ selected: selectedPlaces.includes(pl) }"
                    @click="toggleChip('selectedPlaces', pl)"
                  >
                    {{ pl }}
                  </button>
                </div>
                <div class="multi-actions">
                  <button type="button" @click="selectAll('selectedPlaces', placeOptions)">Select All</button>
                  <button type="button" @click="clearAll('selectedPlaces')">Clear</button>
                </div>
              </div>
            </details>
          </div>
        </details>

        <hr class="section-divider" />

        <!-- Testimony Filters -->
        <details class="dataset-section">
          <summary class="section-summary">
            Testimony Filters
            <span class="summary-switch">
              <input type="checkbox" v-model="toggleTestimonyFilters" />
            </span>
          </summary>

          <div v-if="toggleTestimonyFilters" class="dataset-controls">
            <!-- Category: multi-select chips -->
            <details class="control-collapsible">
              <summary class="control-summary">
                <span class="filter-label">Category</span>
                <span class="summary-count">({{ category.length }}/{{ categoryOptions.length }})</span>
              </summary>
              <div class="multi-select">
                <div class="multi-buttons">
                  <button
                    v-for="(c, i) in categoryOptions"
                    :key="i"
                    type="button"
                    :class="{ selected: category.includes(c) }"
                    @click="toggleChip('category', c)"
                  >
                    {{ c }}
                  </button>
                </div>
                <div class="multi-actions">
                  <button type="button" @click="selectAll('category', categoryOptions)">Select All</button>
                  <button type="button" @click="clearAll('category')">Clear</button>
                </div>
              </div>
            </details>

            <!-- Single-select dropdowns / inputs -->
            <div class="grid-two">
              <div class="field-group">
                <label for="gender">Gender</label>
                <select id="gender" v-model="selectedGender">
                  <option value="">All</option>
                  <option v-for="(g, i) in gendersSanitized" :key="i" :value="g">{{ g }}</option>
                </select>
              </div>

              <div class="field-group">
                <label for="country">Country</label>
                <select id="country" v-model="selectedCountry">
                  <option value="">All</option>
                  <option v-for="(c, i) in countriesSanitized" :key="i" :value="c">{{ c }}</option>
                </select>
              </div>

              <div class="field-group">
                <label for="experience">Experience Group</label>
                <select id="experience" v-model="selectedExperienceGroup">
                  <option value="">All</option>
                  <option v-for="(e, i) in experienceGroupsSanitized" :key="i" :value="e">{{ e }}</option>
                </select>
              </div>

              <div class="field-group">
                <label for="birthYear">Birth Year</label>
                <select id="birthYear" v-model.number="selectedBirthYear">
                  <option :value="''">All</option>
                  <option v-for="(y, i) in birthYearsSanitized" :key="i" :value="Number(y)">{{ Number(y) }}</option>
                </select>
              </div>
            </div>

            <div class="grid-two">
              <div class="field-group">
                <label for="rg">RG Number</label>
                <input id="rg" type="text" v-model.trim="rgNumber" placeholder="RG..." />
              </div>
              <div class="field-group">
                <label for="fullName">Full Name</label>
                <input id="fullName" type="text" v-model.trim="fullName" placeholder="Full name…" />
              </div>
            </div>
          </div>
        </details>

        <hr class="section-divider" />

        <!-- Advanced Options -->
        <details class="dataset-section">
          <summary class="section-summary">Advanced Options</summary>
          <div class="advanced-panel">
            <div class="field-group">
              <label for="num">Number of Results</label>
              <input id="num" type="number" v-model.number="numResults" min="1" max="1000" />
            </div>
          </div>
        </details>

        <!-- Submit -->
        <div class="actions">
          <button type="submit" class="primary">Search</button>
          <button type="button" class="secondary" @click="resetForm">Reset</button>
        </div>
      </form>
    </aside>

    <!-- Optional query box: only when floating AND prop true -->
    <div
      v-if="floating && showQuerySummary && filterDescription"
      class="legend-like"
    >
      <h3>Current Query</h3>
      <p>{{ filterDescription }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: "SearchForm",
  props: {
    genders: { type: Array, default: () => [] },
    countries: { type: Array, default: () => [] },
    experienceGroups: { type: Array, default: () => [] },
    birthYears: { type: Array, default: () => [] },
    placeLabelOptions: { type: Array, default: () => [] },
    showQuerySummary: { type: Boolean, default: false },
    floating: { type: Boolean, default: false }
  },
  data() {
    return {
      queryType: "Vector",
      queryText: "",
      togglePlaces: false,
      selectedPlaces: [],
      toggleTestimonyFilters: false,
      category: [],
      selectedGender: "",
      selectedCountry: "",
      selectedExperienceGroup: "",
      selectedBirthYear: "",
      rgNumber: "",
      fullName: "",
      toggleAdvanced: false,
      numResults: 100,
      categoryOptions: ["question", "answer"]
    };
  },
  computed: {
    // Sanitize/normalize props for robust matching
    gendersSanitized() {
      const xs = (this.genders || []).map(g => (g ?? '').toString().trim());
      return [...new Set(xs)].filter(Boolean);
    },
    countriesSanitized() {
      const xs = (this.countries || []).map(c => (c ?? '').toString().trim());
      return [...new Set(xs)].filter(Boolean);
    },
    experienceGroupsSanitized() {
      const xs = (this.experienceGroups || []).map(e => (e ?? '').toString().trim());
      return [...new Set(xs)].filter(Boolean);
    },
    birthYearsSanitized() {
      const ys = (this.birthYears || [])
        .map(y => Number(y))
        .filter(y => Number.isFinite(y));
      return [...new Set(ys)].sort((a,b) => a - b);
    },
    placeOptions() {
      return (this.placeLabelOptions || []).map(pl => pl.label);
    },
    filterDescription() {
      const parts = [];
      if (this.queryText) parts.push(`q="${this.queryText}"`);
      if (this.queryType) parts.push(`type=${this.queryType}`);
      if (this.togglePlaces && this.selectedPlaces.length) parts.push(`places=[${this.selectedPlaces.join(", ")}]`);
      if (this.toggleTestimonyFilters) {
        if (this.category.length) parts.push(`category=[${this.category.join(", ")}]`);
        if (this.selectedGender) parts.push(`gender=${this.selectedGender}`);
        if (this.selectedCountry) parts.push(`country=${this.selectedCountry}`);
        if (this.selectedExperienceGroup) parts.push(`exp=${this.selectedExperienceGroup}`);
        if (this.selectedBirthYear) parts.push(`birthYear=${this.selectedBirthYear}`);
        if (this.rgNumber) parts.push(`RG=${this.rgNumber}`);
        if (this.fullName) parts.push(`name="${this.fullName}"`);
      }
      if (this.numResults !== 100) parts.push(`n=${this.numResults}`);
      return parts.join("; ");
    }
  },
  methods: {
    toggleChip(fieldName, value) {
      const arr = this[fieldName];
      const i = arr.indexOf(value);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(value);
    },
    selectAll(fieldName, options) {
      this[fieldName] = [...options];
    },
    clearAll(fieldName) {
      this[fieldName] = [];
    },
    resetForm() {
      this.queryType = "Vector";
      this.queryText = "";
      this.togglePlaces = false;
      this.selectedPlaces = [];
      this.toggleTestimonyFilters = false;
      this.category = [];
      this.selectedGender = "";
      this.selectedCountry = "";
      this.selectedExperienceGroup = "";
      this.selectedBirthYear = "";
      this.rgNumber = "";
      this.fullName = "";
      this.toggleAdvanced = false;
      this.numResults = 100;
    },
    submitSearch() {
      const filters = {
        queryType: this.queryType,
        queryText: (this.queryText || '').trim(),
        placesHeader: !!this.togglePlaces,
        labels: this.selectedPlaces.slice(),
        testimonyFilters: !!this.toggleTestimonyFilters,
        category: this.category.slice(),
        gender: (this.selectedGender || '').trim(),
        country: (this.selectedCountry || '').trim(),
        experienceGroup: (this.selectedExperienceGroup || '').trim(),
        // Ensure number (or blank) for birthYear
        birthYear: this.selectedBirthYear === '' ? '' : Number(this.selectedBirthYear),
        rgNumber: (this.rgNumber || '').trim(),
        fullName: (this.fullName || '').trim(),
        advanced: !!this.toggleAdvanced,
        numResults: Number(this.numResults) || 100
      };
      this.$emit("search-submitted", filters);
    }
  }
};
</script>

<style scoped>
/* Container supports inline *and* floating modes */
.search-form-container {
  position: relative;
  height: 100%;
  box-sizing: border-box;
}
.search-form-container.floating { height: auto; }

/* Panel */
.search-panel {
  width: 100%;
  max-width: 100%;
  background: rgba(255,255,255,0.95);
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  overflow: visible;
}
.search-panel.floating {
  position: absolute;
  top: 20px; left: 20px;
  width: 360px;
  max-height: calc(100vh - 40px);
  overflow: auto;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 2;
}

h2 { margin: 0 0 8px; font-size: 1.2rem; }

/* Sections */
.dataset-section { margin-top: 8px; }
.section-summary {
  display: flex; align-items: center; justify-content: space-between;
  font-weight: 600; cursor: pointer; padding: 4px 0;
}
.summary-switch { margin-left: 10px; }
.section-divider { border: none; border-top: 1px solid #ccc; margin: 12px 0 8px; }

/* Fields */
.field-group { margin-bottom: 12px; }
.field-group label { font-weight: 600; margin-bottom: 6px; display: block; }
.field-group input[type="text"],
.field-group input[type="number"],
.field-group select { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; background: #fff; box-sizing: border-box; }
.grid-two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

/* Collapsible chips */
.control-collapsible {
  border: 1px solid #e3e3e3; border-radius: 8px; padding: 6px 8px;
  background: rgba(250,250,250,0.9); margin-bottom: 10px;
}
.control-summary { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
.filter-label { font-weight: 600; }
.summary-count { font-size: 0.85em; color: #555; }

/* Chips */
.multi-buttons { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 6px; }
.multi-buttons button {
  padding: 4px 10px; border: none; border-radius: 14px;
  background: #e6e6e7; color: #000; cursor: pointer;
}
.multi-buttons button.selected { background: #000; color: #fff; }
.multi-actions { display: flex; gap: 8px; }
.multi-actions button {
  font-size: 0.8em; background: #f4f4f4; border: none; border-radius: 6px; padding: 4px 8px; cursor: pointer;
}

/* Actions */
.actions { display: flex; gap: 8px; margin-top: 8px; }
button.primary {
  padding: 10px 12px; background: #000; color: #fff; border: none; border-radius: 6px; cursor: pointer;
}
button.secondary {
  padding: 10px 12px; background: #f4f4f4; color: #000; border: none; border-radius: 6px; cursor: pointer;
}

/* Legend-like box (only when floating) */
.legend-like {
  position: absolute; top: 20px; right: 20px;
  max-width: 360px; max-height: calc(100vh - 40px); overflow: auto;
  background: rgba(255,255,255,0.95); padding: 10px 12px; border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 2;
}
.legend-like h3 { margin: 0 0 6px; font-size: 1rem; }
.legend-like p { margin: 0; font-size: 0.9rem; color: #333; }
</style>
