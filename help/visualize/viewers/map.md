<!-- TITLE: Map viewer -->
<!-- SUBTITLE: -->

# Map viewer

Map viewer shows geospatial data on a map as either markers, or a heat map.

## Adding

1. Go to **Tables** and expand the **Viewers** panel.
1. Locate the **Map Viewer** icon and click it.

When you add a map viewer, it tries to automatically detect columns that contain
longitude and latitude values.

## Settings

To configure a map, click the **Gear** icon on top of the viewer and use the
info panels on the **Context Pane**. For example, you can:

* *Color-code* points using the `Color` property
* *Size-code* points using the `Size` property
* *Control point size* by using `Marker Min Size` and `Marker Max Size` properties

## Interactivity

* Shows only filtered rows
* Shows selected rows in orange
* Synchronizes current record upon clicking on the point

![Map viewer](./map-viewer.gif)

## Custom file viewers

Сustom file viewers give user the opportunity to view files of various geographic extensions.
To see it, open the file manager, hover your mouse over the file and click on it, as shown below.

![Custom file viewer](./map-custom-file-viewer.gif)

The system provides interaction with files of the following extensions:

* .geojson
* .topojson
* .kmz
* .kml

## Controls

|Action              |        Control                |
|------------------------|----------------------|
| Zoom in                                            | Mouse Wheel Up or Plus          |
| Zoom out                                         | Mouse Wheel Down or Minus  |
| Add a point to selection                | Shift+Click the point                   |
| Select multiple points                    | Ctrl+Mouse Drag                       |

## See also

* [Viewers](../viewers.md)
* [Globe](globe.md)
