<template>
  <div class="map-container">
    <!-- Floating menu -->
    <aside class="left-sidebar" v-if="config">
      <h3>Select Data</h3>

      <!-- Transcripts Filter -->
      <details class="dataset-section transcripts-section">
        <summary>{{ sectionLabels.transcripts }}</summary>
        <div class="filter-control">
          <label for="mentioned_in_transcripts">Mentioned in Transcripts</label>
          <select
            id="mentioned_in_transcripts"
            v-model="filterValues.mentioned_in_transcripts"
            @change="updateFilters"
          >
            <option value="">All</option>
            <option :value="true">Yes</option>
            <option :value="false">No</option>
          </select>
        </div>
      </details>

      <hr class="section-divider" />

      <!-- Camps controls -->
      <details class="dataset-section camps-section">
        <summary>{{ sectionLabels.camp }}</summary>
        <div class="dataset-controls">
          <div
            v-for="ctrl in config.fieldControlsByDataset.camp"
            :key="ctrl.field"
            class="filter-control"
          >
            <!-- Multi-select as collapsible buttons (collapsed by default) -->
            <details v-if="ctrl.type === 'multi-select'" class="control-collapsible">
              <summary class="control-summary">
                <span class="filter-label">{{ ctrl.label }}</span>
                <span class="summary-count">
                  ({{ (filterValues[ctrl.field] || []).length }}/{{ (filterOptions[ctrl.field] || []).length }})
                </span>
              </summary>

              <div class="multi-select">
                <div class="multi-buttons">
                  <button
                    v-for="opt in filterOptions[ctrl.field]"
                    :key="opt"
                    type="button"
                    :class="{ selected: filterValues[ctrl.field].includes(opt) }"
                    @click="toggleMultiSelect(ctrl.field, opt)"
                  >
                    {{ opt }}
                  </button>
                </div>
                <div class="multi-actions">
                  <button type="button" @click="selectAll(ctrl.field)">Select All</button>
                  <button type="button" @click="clearAll(ctrl.field)">Clear</button>
                </div>
              </div>
            </details>

            <!-- Dropdown -->
            <div v-else-if="ctrl.type === 'dropdown'">
              <label :for="ctrl.field">{{ ctrl.label }}</label>
              <select
                :id="ctrl.field"
                v-model="filterValues[ctrl.field]"
                @change="updateFilters"
              >
                <option value="">All</option>
                <option
                  v-for="opt in filterOptions[ctrl.field]"
                  :key="opt"
                  :value="opt"
                >
                  {{ opt }}
                </option>
              </select>
            </div>

            <!-- Sliders -->
            <div v-else-if="ctrl.type === 'slider' || ctrl.type === 'time-slider'" class="filter-control">
              <label :for="ctrl.field">
                {{ ctrl.label }}
                <span v-if="ctrl.type === 'slider'">
                  : {{ filterValues[ctrl.field] }}
                </span>
                <span v-else>
                  : {{ msToDateStr(filterValues[ctrl.field]) }}
                </span>
              </label>
              <input
                type="range"
                :id="ctrl.field"
                v-model.number="filterValues[ctrl.field]"
                :min="getMin(ctrl.field)"
                :max="getMax(ctrl.field)"
                :step="ctrl.type === 'time-slider' ? 86400000 : 1"
                :disabled="!hasRange(ctrl.field)"
                @input="onSliderInput(ctrl.field)"
                @change="onSliderChange(ctrl.field)"
              />
            </div>
          </div>
        </div>
      </details>

      <hr class="section-divider" />

      <!-- Ghettos controls -->
      <details class="dataset-section ghettos-section">
        <summary>{{ sectionLabels.ghetto }}</summary>
        <div class="dataset-controls">
          <div
            v-for="ctrl in config.fieldControlsByDataset.ghetto"
            :key="ctrl.field"
            class="filter-control"
          >
            <!-- Multi-select as collapsible buttons (collapsed by default) -->
            <details v-if="ctrl.type === 'multi-select'" class="control-collapsible">
              <summary class="control-summary">
                <span class="filter-label">{{ ctrl.label }}</span>
                <span class="summary-count">
                  ({{ (filterValues[ctrl.field] || []).length }}/{{ (filterOptions[ctrl.field] || []).length }})
                </span>
              </summary>

              <div class="multi-select">
                <div class="multi-buttons">
                  <button
                    v-for="opt in filterOptions[ctrl.field]"
                    :key="opt"
                    type="button"
                    :class="{ selected: filterValues[ctrl.field].includes(opt) }"
                    @click="toggleMultiSelect(ctrl.field, opt)"
                  >
                    {{ opt }}
                  </button>
                </div>
                <div class="multi-actions">
                  <button type="button" @click="selectAll(ctrl.field)">Select All</button>
                  <button type="button" @click="clearAll(ctrl.field)">Clear</button>
                </div>
              </div>
            </details>

            <!-- Dropdown -->
            <div v-else-if="ctrl.type === 'dropdown'">
              <label :for="ctrl.field">{{ ctrl.label }}</label>
              <select
                :id="ctrl.field"
                v-model="filterValues[ctrl.field]"
                @change="updateFilters"
              >
                <option value="">All</option>
                <option
                  v-for="opt in filterOptions[ctrl.field]"
                  :key="opt"
                  :value="opt"
                >
                  {{ opt }}
                </option>
              </select>
            </div>

            <!-- (If you add sliders to ghetto dataset, they render here too) -->
            <div v-else-if="ctrl.type === 'slider' || ctrl.type === 'time-slider'" class="filter-control">
              <label :for="ctrl.field">
                {{ ctrl.label }}
                <span v-if="ctrl.type === 'slider'">
                  : {{ filterValues[ctrl.field] }}
                </span>
                <span v-else>
                  : {{ msToDateStr(filterValues[ctrl.field]) }}
                </span>
              </label>
              <input
                type="range"
                :id="ctrl.field"
                v-model.number="filterValues[ctrl.field]"
                :min="getMin(ctrl.field)"
                :max="getMax(ctrl.field)"
                :step="ctrl.type === 'time-slider' ? 86400000 : 1"
                :disabled="!hasRange(ctrl.field)"
                @input="onSliderInput(ctrl.field)"
                @change="onSliderChange(ctrl.field)"
              />
            </div>
          </div>
        </div>
      </details>
    </aside>

    <!-- Legend Floating Top-Right -->
    <div class="legend-floating" ref="legend">
      <div class="legend-header">
        <h3>Legend</h3>
        <button class="clear-filters-btn" type="button" @click="resetFilters">Clear filters</button>
      </div>
      <div class="legend-item">
        <span class="color-circle" style="background:#AA66CD;"></span> Ghetto
      </div>
      <div class="legend-item">
        <span class="color-circle" style="background:#FFAA00;"></span> Camp / Subcamp
      </div>
      <div class="legend-item">
        <span class="color-circle" style="background:#FF5733;"></span> Death Camp
      </div>
      <div class="legend-item">
        <span class="color-circle" style="background:#888888;"></span> Other
      </div>

      <!-- Current query moved here -->
      <div v-if="filterDescription" class="current-query in-legend">
        <h4>Current Query</h4>
        <p>{{ filterDescription }}</p>
      </div>
    </div>

    <!-- Map -->
    <div ref="mapContainer" class="map"></div>

    <!-- Popup (below legend, floating & scrollable) -->
    <div
      v-if="popupVisible"
      class="popup"
      :style="popupStyle"
    >
      <h3 class="popup-title">{{ popupData.SiteName }}</h3>
      <dl class="popup-details">
        <div class="popup-field">
          <dt>Type</dt>
          <dd>{{ popupData.SiteType }}</dd>
        </div>
        <div class="popup-field" v-if="popupData.EncyStruc">
          <dt>Encyclopedia Structure</dt>
          <dd>{{ popupData.EncyStruc }}</dd>
        </div>

        <!-- Dataset-specific fields -->
        <div
          v-for="entry in popupFieldEntries"
          :key="entry.label"
          class="popup-field"
        >
          <dt>{{ entry.label }}</dt>
          <dd>{{ entry.value }}</dd>
        </div>

        <!-- Transcript link -->
        <div v-if="isMentioned(popupData) && transcriptLink" class="popup-field transcript-field">
          <dt>Transcript</dt>
          <dd>
            <a :href="transcriptLink" class="transcript-link">Search mentions of this place in transcripts</a>
          </dd>
        </div>
      </dl>
      <button @click="closePopup" class="popup-close">Close</button>
    </div>
  </div>
</template>

<script>
import maplibre from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import config from '@/static/data/map-config.json';

// --- ISO date handling + defaults for time sliders ---
const DEFAULT_DATE_START = '1933-02-01';
const DEFAULT_DATE_END   = '1945-05-05';
const BASE_PATH = process.env.NUXT_PUBLIC_BASE_PATH || '';

function dateStrToMs(s) {
  if (!s) return NaN;
  const t = Date.parse(s); // expects YYYY-MM-DD
  return Number.isNaN(t) ? NaN : t;
}
function msToDateStr(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return '';
  const d = new Date(Number(ms));
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

export default {
  name: 'Map',
  props: {
    mapStyle: { type: String, default: 'https://demotiles.maplibre.org/style.json' },
    center:    { type: Array,  default: () => [15.2551, 52.5200] },
    zoom:      { type: Number, default: 4 }
  },
  data() {
    // Clone config and make dataset-specific field keys so camp/ghetto filters don't bleed into each other
    const configClone = JSON.parse(JSON.stringify(config));
    ['camp', 'ghetto'].forEach(ds => {
      configClone.fieldControlsByDataset[ds] = (configClone.fieldControlsByDataset[ds] || []).map(ctrl => {
        return {
          ...ctrl,
          dataField: ctrl.field,
          field: `${ds}__${ctrl.field}`
        };
      });
    });

    const values = {};
    const options = {};
    const allCtrls = [
      ...configClone.dropdownFilters,
      ...Object.values(configClone.fieldControlsByDataset).flat()
    ];

    allCtrls.forEach(ctrl => {
      if (ctrl.type === 'multi-select') {
        values[ctrl.field] = [];
        options[ctrl.field] = ctrl.options || [];
      } else if (ctrl.type === 'slider') {
        if (ctrl.options?.min != null && ctrl.options?.max != null) {
          values[ctrl.field] = Number(ctrl.options.min);
          options[ctrl.field] = { min: Number(ctrl.options.min), max: Number(ctrl.options.max) };
        } else {
          values[ctrl.field] = null;
          options[ctrl.field] = { min: null, max: null };
        }
      } else if (ctrl.type === 'time-slider') {
        // Convert provided YYYY-MM-DD (if any) to ms; fallback to defaults
        let minStr = ctrl.options?.min ?? ctrl.options?.start;
        let maxStr = ctrl.options?.max ?? ctrl.options?.end;
        if (minStr == null || maxStr == null) {
          minStr = DEFAULT_DATE_START;
          maxStr = DEFAULT_DATE_END;
        }
        const minMs = dateStrToMs(minStr);
        const maxMs = dateStrToMs(maxStr);
        const finalMin = Number.isNaN(minMs) ? dateStrToMs(DEFAULT_DATE_START) : minMs;
        const finalMax = Number.isNaN(maxMs) ? dateStrToMs(DEFAULT_DATE_END)   : maxMs;
        values[ctrl.field]  = finalMin; // initialize at min (won't filter until moved)
        options[ctrl.field] = { min: finalMin, max: finalMax, __isTime: true };
      } else {
        values[ctrl.field] = '';
        options[ctrl.field] = ctrl.options || [];
      }
    });

    // transcripts boolean selector
    values.mentioned_in_transcripts = '';
    options.mentioned_in_transcripts = [true, false];

    return {
      config: configClone,
      filterValues: values,
      filterOptions: options,
      sectionLabels: { camp: 'Camps', ghetto: 'Ghettos', transcripts: 'Transcripts' },
      map: null,
      popupVisible: false,
      popupData: {},
      filterDescription: '',
      legendHeight: 0,
      msToDateStr // expose for template label
    };
  },
  computed: {
    popupStyle() {
      const top = this.legendHeight ? this.legendHeight + 28 : 80;
      return {
        top: `${top}px`,
        right: '20px',
        maxHeight: `calc(100vh - ${top + 20}px)`,
        overflow: 'auto'
      };
    },
    popupFieldEntries() {
      if (!this.popupData) return [];
      const st = (this.popupData.SiteType || '').toLowerCase();
      let ctrls = [];
      if (st === 'ghetto') ctrls = this.config.fieldControlsByDataset.ghetto || [];
      else if (st.includes('camp')) ctrls = this.config.fieldControlsByDataset.camp || [];

      return ctrls
        .map(ctrl => {
          const val = this.popupData[ctrl.dataField] ?? this.popupData[ctrl.field];
          return { label: ctrl.label, value: val };
        })
        .filter(entry => this.isDisplayValue(entry.value));
    },
    transcriptLink() {
      if (!this.isMentioned(this.popupData)) return '';
      const name = this.popupData?.SiteName || '';
      const q = encodeURIComponent(name);
      return `${BASE_PATH}/search?q=${q}`;
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.measureLegend();
      window.addEventListener('resize', this.measureLegend);
    });
    this.initMap();
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.measureLegend);
  },
  methods: {
    isControlActive(ctrl) {
      const v = this.filterValues[ctrl.field];
      const opts = this.filterOptions[ctrl.field];
      if (ctrl.type === 'dropdown') return v !== '';
      if (ctrl.type === 'multi-select') return Array.isArray(v) && v.length > 0;
      if (ctrl.type === 'slider') {
        const min = opts?.min;
        return v != null && min != null && Number(v) > Number(min);
      }
      if (ctrl.type === 'time-slider') {
        const min = opts?.min;
        return v != null && min != null && Number(v) > Number(min);
      }
      return false;
    },
    slugify(text) {
      const base = (text || '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      return base || 'value';
    },
    // ---- slider enable/guard helpers ----
    hasRange(field) {
      const o = this.filterOptions[field];
      return o && o.min != null && o.max != null && Number.isFinite(o.min) && Number.isFinite(o.max) && o.max > o.min;
    },
    getMin(field) {
      const o = this.filterOptions[field];
      return (o && o.min != null) ? Number(o.min) : 0;
    },
    getMax(field) {
      const o = this.filterOptions[field];
      return (o && o.max != null) ? Number(o.max) : 0;
    },
    clampToRange(field, val) {
      const min = this.getMin(field);
      const max = this.getMax(field);
      if (!this.hasRange(field)) return val;
      if (val < min) return min;
      if (val > max) return max;
      return val;
    },
    isDisplayValue(val) {
      if (val === undefined || val === null) return false;
      const s = String(val).trim();
      if (!s) return false;
      const falsy = ['false', 'FALSE', 'False', '0'];
      return !falsy.includes(s);
    },
    isMentioned(data) {
      const v = data?.mentioned_in_transcripts;
      return [true, 'true', 'True', 'TRUE', 1, '1'].includes(v);
    },
    onSliderInput(field) {
      const v = Number(this.filterValues[field]);
      const clamped = this.clampToRange(field, v);
      if (clamped !== v) this.$set(this.filterValues, field, clamped);
      const ctrl = [...this.config.dropdownFilters, ...Object.values(this.config.fieldControlsByDataset).flat()].find(c => c.field === field);
      if (ctrl && ctrl.type === 'time-slider') return; // defer update to change to reduce jitter
      this.updateFilters();
    },
    onSliderChange(field) {
      const v = Number(this.filterValues[field]);
      const clamped = this.clampToRange(field, v);
      if (clamped !== v) this.$set(this.filterValues, field, clamped);
      this.updateFilters();
    },

    // ---- clear filters ----
    resetFilters() {
      const values = this.filterValues;
      const options = this.filterOptions;

      // dropdowns & multi-selects
      this.config.dropdownFilters.forEach(c => {
        if (c.type === 'multi-select') this.$set(values, c.field, []);
        else if (c.type === 'dropdown') this.$set(values, c.field, '');
        else if (c.type === 'slider') {
          const min = (options[c.field]?.min != null) ? Number(options[c.field].min) : 0;
          this.$set(values, c.field, min);
        } else if (c.type === 'time-slider') {
          const min = (options[c.field]?.min != null) ? Number(options[c.field].min) : dateStrToMs(DEFAULT_DATE_START);
          this.$set(values, c.field, min); // value==min -> no filter
        }
      });

      Object.values(this.config.fieldControlsByDataset).flat().forEach(c => {
        if (c.type === 'multi-select') this.$set(values, c.field, []);
        else if (c.type === 'dropdown') this.$set(values, c.field, '');
        else if (c.type === 'slider') {
          const min = (options[c.field]?.min != null) ? Number(options[c.field].min) : 0;
          this.$set(values, c.field, min);
        } else if (c.type === 'time-slider') {
          const min = (options[c.field]?.min != null) ? Number(options[c.field].min) : dateStrToMs(DEFAULT_DATE_START);
          this.$set(values, c.field, min);
        }
      });

      // transcripts
      this.$set(values, 'mentioned_in_transcripts', '');

      this.updateFilters();
    },

    measureLegend() {
      const el = this.$refs.legend;
      this.legendHeight = el ? el.getBoundingClientRect().height : 0;
    },
    initMap() {
      const protocol = new Protocol();
      maplibre.addProtocol('pmtiles', protocol.tile);

      this.map = new maplibre.Map({
        container: this.$refs.mapContainer,
        style: this.mapStyle,
        center: this.center,
        zoom: this.zoom
      });

      this.map.on('load', () => {
        const tileUrl = 'pmtiles://https://placing-holocaust-tiles.s3.us-east-2.amazonaws.com/gazetteer_processed.pmtiles';
        this.map.addSource('gazetteer', {
          type: 'vector',
          url: tileUrl
        });

        this.map.addLayer({
          id: 'gazetteer',
          type: 'circle',
          source: 'gazetteer',
          'source-layer': config.sourceLayer || 'gazetteer_full_output_processed',
          paint: {
            // Circle radius grows as you zoom in
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              5, 2.5,
              8, 4,
              12, 6
            ],

            // Fill color by SiteType
            'circle-color': [
              'match', ['get', 'SiteType'],
              'Ghetto', '#AA66CD',
              'Camp', '#FFAA00',
              'Main camp', '#FFAA00',
              'Subcamp', '#FFAA00',
              'Death camp', '#FF5733',
              '#888888' // fallback
            ],

            // Stroke color: slightly brighter version of fill
            'circle-stroke-color': [
              'match', ['get', 'SiteType'],
              'Ghetto', '#C188D8',
              'Camp', '#FFC54D',
              'Main camp', '#FFC54D',
              'Subcamp', '#FFC54D',
              'Death camp', '#FF7B55',
              '#AAAAAA'
            ],
            'circle-stroke-width': [
              'interpolate', ['linear'], ['zoom'],
              5, 0.5,
              8, 1,
              12, 1.5
            ],
            'circle-opacity': 0.9
          }
        });

        this.map.once('idle', () => {
          this.loadFilterOptions();
          this.updateFilters();
        });

        this.map.on('click', 'gazetteer', this.showPopup);
      });
    },
    loadFilterOptions() {
      let feats = [];
      try {
        feats = this.map.querySourceFeatures(
          'gazetteer',
          { sourceLayer: this.config.sourceLayer || 'gazetteer_full_output_processed' }
        );
      } catch (e) {
        console.warn('Failed to query source features', e);
        return;
      }

      // Populate dropdowns from tiles if flagged
      this.config.dropdownFilters.forEach(f => {
        if (f.loadFrom === 'tiles' && !f.options) {
          const set = new Set(
            feats
              .map(ft => ft.properties?.[f.field])
              .filter(v => v !== null && v !== undefined && v !== '')
          );
          this.$set(this.filterOptions, f.field, Array.from(set).sort());
        }
      });

      // Populate multi-select options if not provided
      Object.values(this.config.fieldControlsByDataset).flat()
        .filter(c => c.type === 'multi-select' && (!c.options || c.options.length === 0))
        .forEach(c => {
          const dataField = c.dataField || c.field;
          const set = new Set();
          feats.forEach(ft => {
            const val = ft.properties?.[dataField];
            if (val === null || val === undefined || val === '') return;
            if (dataField === 'Nation' || dataField === 'InmateType') {
              String(val).split(';').forEach(tok => {
                const t = tok.trim();
                if (t) set.add(t);
              });
            } else {
              set.add(val);
            }
          });
          this.$set(this.filterOptions, c.field, Array.from(set).sort());
        });

      // Derive min/max for sliders and time-sliders if missing
      const allCtrls = [
        ...this.config.dropdownFilters,
        ...Object.values(this.config.fieldControlsByDataset).flat()
      ];

      allCtrls.forEach(c => {
        const dataField = c.dataField || c.field;
        const fieldExists = feats.some(ft => Object.prototype.hasOwnProperty.call(ft.properties || {}, dataField));
        if (!fieldExists) return;

        if (c.type === 'slider' &&
            (this.filterOptions[c.field]?.min == null || this.filterOptions[c.field]?.max == null)) {
          const vals = feats.map(ft => ft.properties?.[dataField])
            .filter(v => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v)))
            .map(v => Number(v));

          if (vals.length) {
            const min = Math.min(...vals);
            const max = Math.max(...vals);
            this.$set(this.filterOptions, c.field, { min, max });
            const current = this.filterValues[c.field];
            const nextVal = (current == null || Number.isNaN(Number(current))) ? min : Math.min(Math.max(Number(current), min), max);
            this.$set(this.filterValues, c.field, nextVal);
          } else {
            this.$set(this.filterOptions, c.field, { min: null, max: null });
          }
        }

        if (c.type === 'time-slider' &&
            (this.filterOptions[c.field]?.min == null || this.filterOptions[c.field]?.max == null)) {
          // Gather ISO strings -> ms
          const msVals = feats.map(ft => ft.properties?.[dataField])
            .filter(v => v && typeof v === 'string')
            .map(v => dateStrToMs(v))
            .filter(t => !Number.isNaN(t));

          let minMs, maxMs;
          if (msVals.length) {
            minMs = Math.min(...msVals);
            maxMs = Math.max(...msVals);
          } else {
            // fallback to defaults
            minMs = dateStrToMs(DEFAULT_DATE_START);
            maxMs = dateStrToMs(DEFAULT_DATE_END);
          }

          this.$set(this.filterOptions, c.field, { min: minMs, max: maxMs, __isTime: true });

          const current = this.filterValues[c.field];
          const nextVal =
            (current == null || Number.isNaN(Number(current)))
              ? minMs
              : Math.min(Math.max(Number(current), minMs), maxMs);

          this.$set(this.filterValues, c.field, nextVal);
        }
      });
    },
    toggleMultiSelect(field, opt) {
      const arr = this.filterValues[field];
      const idx = arr.indexOf(opt);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(opt);
      this.updateFilters();
    },
    selectAll(field) {
      this.filterValues[field] = [...(this.filterOptions[field] || [])];
      this.updateFilters();
    },
    clearAll(field) {
      this.filterValues[field] = [];
      this.updateFilters();
    },
    updateFilters() {
      const campTypes = ['Camp', 'Main camp', 'Subcamp', 'Death camp'];
      const ghettoTypes = ['Ghetto'];
      const containsFields = ['Nation', 'InmateType'];

      const addControlFilters = (ctrl, expr) => {
        const v = this.filterValues[ctrl.field];
        const dataField = ctrl.dataField || ctrl.field;

        if (ctrl.type === 'dropdown' && v) {
          expr.push(['==', ['get', dataField], v]);
        }

        if (ctrl.type === 'multi-select' && Array.isArray(v) && v.length) {
          if (dataField === 'HoldPStruc' || dataField === 'RestrType') {
            const clauses = v.map(opt => ['==', ['get', `${dataField}_${this.slugify(opt)}`], 'TRUE']);
            if (clauses.length) expr.push(['any', ...clauses]);
          } else if (dataField === 'Demographics') {
            const fieldMap = {
              Men: 'Men',
              Women: 'Women',
              Elderly: 'Elderly',
              Youth: 'Youth',
              Children: 'Children'
            };
            const trueLiterals = ['TRUE', 'True', 'true', true, 1, '1'];
            const clauses = v
              .map(opt => fieldMap[opt])
              .filter(Boolean)
              .map(f => ['in', ['get', f], ['literal', trueLiterals]]);
            // Fallback: also check semicolon list if present
            v.forEach(opt => {
              clauses.push(['>=', ['index-of', opt, ['coalesce', ['get', 'DemographicsList'], '']], 0]);
            });
            if (clauses.length) expr.push(['any', ...clauses]); // match any selected demographic
          } else if (containsFields.includes(dataField)) {
            const clauses = v.map(opt => ['>=', ['index-of', opt, ['get', dataField]], 0]);
            if (clauses.length) expr.push(['any', ...clauses]);
          } else {
            expr.push(['in', ['get', dataField], ['literal', v]]);
          }
        }

        const sliderOpts = this.filterOptions[ctrl.field];

        // numeric slider: only apply if value > min (so default state doesn't filter)
        if (ctrl.type === 'slider' && v != null && sliderOpts && sliderOpts.min != null && v > sliderOpts.min) {
          expr.push(['>=', ['to-number', ['get', dataField]], v]);
        }

        // time sliders: handle Start/End ranges separately; other time sliders apply simple compare
        if (
          ctrl.type === 'time-slider' &&
          !['StartMid_ISO', 'EndMid_ISO'].includes(dataField) &&
          v != null &&
          sliderOpts &&
          sliderOpts.min != null &&
          v > sliderOpts.min
        ) {
          const vStr = msToDateStr(v);
          if (vStr) {
            const compareOp = dataField.toLowerCase().includes('end') ? '<=' : '>=';
            expr.push([compareOp, ['get', dataField], vStr]);
          }
        }
      };

      const globalExpr = ['all'];
      this.config.dropdownFilters.forEach(c => addControlFilters(c, globalExpr));

      const buildTimeRangeExpr = (ctrls) => {
        const startCtrl = ctrls.find(c => c.dataField === 'StartMid_ISO');
        const endCtrl   = ctrls.find(c => c.dataField === 'EndMid_ISO');
        if (!startCtrl && !endCtrl) return null;

        const startVal = startCtrl ? this.filterValues[startCtrl.field] : null;
        const endVal   = endCtrl ? this.filterValues[endCtrl.field] : null;
        const startOpts = startCtrl ? this.filterOptions[startCtrl.field] : null;
        const endOpts   = endCtrl ? this.filterOptions[endCtrl.field] : null;

        const startActive = startCtrl && startOpts?.min != null && startVal != null && Number(startVal) > Number(startOpts.min);
        const endActive   = endCtrl && endOpts?.min != null && endVal != null && Number(endVal) > Number(endOpts.min);

        if (!startActive && !endActive) return null;

        const startMs = startActive ? Number(startVal) : Number(startOpts?.min);
        const endMs   = endActive ? Number(endVal)   : Number(endOpts?.max);
        const startStr = msToDateStr(startMs);
        const endStr   = msToDateStr(endMs);
        if (!startStr || !endStr) return null;

        const endField = ['coalesce', ['get', 'EndMid_ISO'], ['get', 'StartMid_ISO']];
        return ['all', ['<=', ['get', 'StartMid_ISO'], endStr], ['>=', endField, startStr]];
      };

      const buildSiteExpr = (types, ctrls) => {
        const expr = ['all', ['in', ['get', 'SiteType'], ['literal', types]]];
        ctrls.forEach(c => addControlFilters(c, expr));
        const timeRangeExpr = buildTimeRangeExpr(ctrls);
        if (timeRangeExpr) expr.push(timeRangeExpr);
        return expr;
      };

      const campExpr = buildSiteExpr(campTypes, this.config.fieldControlsByDataset.camp || []);
      const ghettoExpr = buildSiteExpr(ghettoTypes, this.config.fieldControlsByDataset.ghetto || []);

      const campActive = (this.config.fieldControlsByDataset.camp || []).some(c => this.isControlActive(c));
      const ghettoActive = (this.config.fieldControlsByDataset.ghetto || []).some(c => this.isControlActive(c));

      let expr;
      if (campActive && ghettoActive) {
        expr = ['all', ...globalExpr.slice(1), ['any', campExpr, ghettoExpr]];
      } else if (campActive) {
        expr = ['all', ...globalExpr.slice(1), campExpr];
      } else if (ghettoActive) {
        expr = ['all', ...globalExpr.slice(1), ghettoExpr];
      } else {
        expr = globalExpr;
      }

      const t = this.filterValues.mentioned_in_transcripts;
      if (t === true) {
        expr.push(['in', ['get', 'mentioned_in_transcripts'], ['literal', [true, 'true', 'True', 'TRUE', 1, '1']]]);
      }
      if (t === false) {
        expr.push(['in', ['get', 'mentioned_in_transcripts'], ['literal', [false, 'false', 'False', 'FALSE', 0, '0']]]);
      }

      if (this.map && this.map.getLayer('gazetteer')) {
        this.map.setFilter('gazetteer', expr);
      }
      this._updateFilterDescription();
    },
    _updateFilterDescription() {
      const parts = [];
      Object.keys(this.filterValues).forEach(field => {
        const val = this.filterValues[field];
        if (field === 'mentioned_in_transcripts') {
          if (val === true) parts.push('Mentioned in transcripts: Yes');
          if (val === false) parts.push('Mentioned in transcripts: No');
        } else if (val && typeof val === 'string') {
          parts.push(`${field}: ${val}`);
        } else if (Array.isArray(val) && val.length) {
          parts.push(`${field}: ${val.join(', ')}`);
        } else if (
          typeof val === 'number' &&
          this.filterOptions[field]?.min != null &&
          val > this.filterOptions[field].min
        ) {
          const isTime = !!this.filterOptions[field]?.__isTime;
          parts.push(`${field} ≥ ${isTime ? msToDateStr(val) : val}`);
        }
      });
      this.filterDescription = parts.join('; ');
    },
    showPopup(e) {
      const p = e.features[0].properties;
      this.popupData = p;
      this.popupVisible = true;

      const lng = Number(p.Long_X);
      const lat = Number(p.Lat_Y);
      if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
        this.map.flyTo({ center: [lng, lat], zoom: 8 });
      }

      this.$nextTick(this.measureLegend);
    },
    closePopup() { this.popupVisible = false; },
    formatDate(ts) { return msToDateStr(ts); } // keep compatibility if used elsewhere
  }
};
</script>

<style scoped>
.map-container { display:flex; position:relative; height:100vh; }
.map { flex:1; }

/* Floating left menu */
.left-sidebar {
  position:absolute;
  top:20px; left:20px;
  width:320px;
  max-height:calc(100vh - 40px);
  background:rgba(255,255,255,0.95);
  padding:12px;
  overflow:auto;
  border-radius:8px;
  box-shadow:0 2px 8px rgba(0,0,0,0.15);
  z-index:2;
}
.left-sidebar details summary { cursor:pointer; font-weight:600; margin:6px 0; }
.dataset-section { margin-top:8px; }
.section-divider {
  border:none;
  border-top:1px solid #ccc;
  margin:12px 0 8px;
}
.filter-control { margin-bottom:12px; }
.filter-label { font-weight:600; }

/* Collapsible control header */
.control-collapsible {
  border:1px solid #e3e3e3;
  border-radius:8px;
  padding:6px 8px;
  background:rgba(250,250,250,0.9);
  margin-bottom:10px;
}
.control-summary {
  display:flex;
  align-items:center;
  justify-content:space-between;
  list-style:none;
  cursor:pointer;
}
.summary-count { font-size:0.85em; color:#555; }

/* Multi-select buttons */
.multi-buttons { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0 6px; }
.multi-buttons button {
  padding:4px 10px;
  border:none;
  border-radius:14px;
  background:#e6e6e7;
  color:#000;
  cursor:pointer;
}
.multi-buttons button.selected {
  background:#000;
  color:#fff;
}
.multi-actions { display:flex; gap:8px; }
.multi-actions button {
  font-size:0.8em;
  background:#f4f4f4;
  border:none;
  border-radius:6px;
  padding:4px 8px;
  cursor:pointer;
}

/* Legend floating top-right */
.legend-floating {
  position:absolute;
  top:20px; right:20px;
  max-width:320px;
  background:rgba(255,255,255,0.95);
  padding:10px 12px;
  border-radius:8px;
  box-shadow:0 2px 8px rgba(0,0,0,0.15);
  z-index:2;
}
.legend-floating .legend-header{
  display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px;
}
.clear-filters-btn{
  font-size:.85rem; line-height:1; padding:6px 10px; border:none; border-radius:6px;
  background:#f1f1f4; cursor:pointer;
}
.clear-filters-btn:hover{ background:#e6e6ea; }

.legend-floating h3 { margin:0; font-size:1rem; }
.legend-item { display:flex; align-items:center; margin-bottom:4px; }
.color-circle {
  width:14px; height:14px;
  border-radius:50%;
  border:1px solid #000;
  margin-right:6px;
}
/* Current query inside legend */
.current-query.in-legend { margin-top:8px; }
.current-query.in-legend h4 { margin:8px 0 4px; font-size:0.95rem; }
.current-query.in-legend p { margin:0; font-size:0.9rem; color:#333; }

/* Popup (floats below legend, scrollable with max height) */
.popup {
  position:absolute;
  right:20px;
  width:340px;
  background:#fff;
  padding:16px 16px 14px;
  border:1px solid #d8d8dc;
  border-radius:10px;
  box-shadow:0 6px 18px rgba(0,0,0,0.15);
  z-index:2;
  overflow:auto;
}
.popup-title {
  margin:0 0 10px;
  font-size:1.1rem;
  line-height:1.25;
  letter-spacing:.2px;
}
.popup-details {
  margin:0; padding:0;
}
.popup-field {
  display:block;
  margin:0 0 10px;
}
.popup-field dt {
  margin:0 0 2px;
  font-size:.78rem;
  line-height:1.2;
  text-transform:uppercase;
  letter-spacing:.04em;
  color:#555a66;
}
.popup-field dd {
  margin:0;
  font-size:.96rem;
  line-height:1.45;
  color:#15151a;
  word-break:break-word;
}
.transcript-link { color:#0a66c2; text-decoration:underline; }
.popup-close {
  margin-top:12px;
  padding:6px 12px;
  background:#f4f4f7;
  border:1px solid #e4e4ea;
  border-radius:6px;
  cursor:pointer;
}
.popup-close:hover { background:#ececf1; }
</style>
