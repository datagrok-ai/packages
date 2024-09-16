{{/*
This is a Helm helper template.
Place reusable template definitions and functions here.
*/}}

{{/* Define a helper function to get the name of the chart */}}
{{- define "base.fullname" -}}
{{- .Release.Name }}
{{- end }}

{{/* Define a helper function to generate labels */}}

{{/* Define a default set of labels */}}
{{- define "base.defaultLabels" -}}
app.kubernetes.io/name: {{ include "base.fullname" . }}
app.kubernetes.io/instance: {{ include "base.fullname" . }}
app.kubernetes.io/version: {{ .Chart.Version | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "base.selectorLabels" -}}
app.kubernetes.io/name: {{ include "base.fullname" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
network: {{ .Release.Name }}
{{- end }}
