// Mapping type Prisma → widget UI + type de filtre
// kind: 'scalar' | 'enum' | 'object' (relation)

const SCALAR_WIDGET_MAP = {
  String:   'text',
  Int:      'number',
  Float:    'number',
  Decimal:  'number',
  Boolean:  'toggle',
  DateTime: 'datetime',
  Json:     'json',
  Bytes:    'text',
  BigInt:   'number',
}

const FILTER_WIDGET_MAP = {
  text:     'search',    // input texte libre
  number:   'range',     // min / max
  toggle:   'boolean',   // Tous / Oui / Non
  datetime: 'daterange', // plage de dates
  json:     null,        // pas de filtre sur JSON
}

// Transforme un champ DMMF en config de widget exploitable par l'UI
export function parseField(field) {
  // Relation (ForeignKey, etc.)
  if (field.kind === 'object') {
    return {
      name:         field.name,
      type:         'relation',
      widget:       'relation-select',
      relatedModel: field.type,
      isRequired:   field.isRequired,
      isList:       field.isList,
      filterWidget: 'relation-select',
    }
  }

  // Enum
  if (field.kind === 'enum') {
    return {
      name:         field.name,
      type:         'enum',
      widget:       'enum-select',
      enumName:     field.type,
      isRequired:   field.isRequired,
      filterWidget: 'enum-select',
    }
  }

  // Scalaire
  const widget = SCALAR_WIDGET_MAP[field.type] ?? 'text'

  return {
    name:         field.name,
    type:         field.type.toLowerCase(),
    widget,
    isRequired:   field.isRequired,
    isUnique:     field.isUnique ?? false,
    hasDefault:   field.default !== undefined && field.default !== null,
    filterWidget: FILTER_WIDGET_MAP[widget] ?? null,
  }
}

// Transforme tous les champs d'un modèle en map { fieldName → widgetConfig }
export function parseModelFields(dmmfFields) {
  return Object.fromEntries(
    dmmfFields.map(f => [f.name, parseField(f)])
  )
}

// Détermine si un champ doit être affiché en lecture seule automatiquement
// (complément au readOnly déclaratif du dev)
export function isAutoReadOnly(fieldName, widgetConfig) {
  if (fieldName === 'id')        return true
  if (fieldName === 'createdAt') return true
  if (fieldName === 'updatedAt') return true
  // Les champs avec @default(autoincrement()) ou @default(uuid()) sont auto-gérés par Prisma
  if (widgetConfig.hasDefault && widgetConfig.name === 'id') return true
  return false
}

// Construit la config complète d'un formulaire à partir de la config du registry
// Retourne les champs dans l'ordre déclaré, avec leur widget résolu
export function buildFormFields(modelConfig, enumMap = {}) {
  const fieldMap = parseModelFields(modelConfig.fields)
  const { fields, readOnly, hidden } = modelConfig.form

  return fields
    .filter(name => !hidden.includes(name))
    .map(name => {
      const widget = fieldMap[name]
      if (!widget) return null

      const resolved = {
        ...widget,
        readOnly: readOnly.includes(name) || isAutoReadOnly(name, widget),
      }

      // Injecter les valeurs de l'enum depuis le DMMF
      if (widget.widget === 'enum-select' && widget.enumName) {
        resolved.enumValues = enumMap[widget.enumName] ?? []
      }

      return resolved
    })
    .filter(Boolean)
}

// Construit la config des colonnes de liste
export function buildListColumns(modelConfig) {
  const fieldMap = parseModelFields(modelConfig.fields)
  const { fields } = modelConfig.list

  return fields
    .map(name => {
      const widget = fieldMap[name]
      if (!widget) return null
      return { name, ...widget }
    })
    .filter(Boolean)
}

// Construit la config des filtres disponibles pour un modèle
export function buildFilterConfig(modelConfig, enumMap = {}) {
  const fieldMap = parseModelFields(modelConfig.fields)
  const { filters } = modelConfig.list

  return filters
    .map(name => {
      const widget = fieldMap[name]
      if (!widget || !widget.filterWidget) return null

      const config = {
        name,
        filterWidget: widget.filterWidget,
        type:         widget.type,
        enumName:     widget.enumName ?? null,
        relatedModel: widget.relatedModel ?? null,
        enumValues:   null,
      }

      // Injecter les valeurs de l'enum pour le filtre
      if (widget.widget === 'enum-select' && widget.enumName) {
        config.filterWidget = 'enum-select'
        config.enumValues   = enumMap[widget.enumName] ?? []
      }

      return config
    })
    .filter(Boolean)
}
