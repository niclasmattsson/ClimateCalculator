# ClimateCalculator
 
A "simple climate model" that calculates future CO<sub>2</sub> concentrations and temperature increase
for emission pathways you design in your browser. User interface in HTML + Javascript, climate model
and webserver backend in Julia 1.x.

## Installation

Type `]` to enter Julia's package mode, then:

```
(@v1.4) pkg> add https://github.com/niclasmattsson/ClimateCalculator
```

After the installation, hit backspace at the prompt to exit package mode.

## Startup

```
julia> using ClimateCalculator

julia> startserver()
Open http://localhost:8000/static/UI_layout.html in your web browser.

julia> 
```

Copy that URL to your browser to load the model. Resize the text using your browser's zoom feature
(from the menu or with `CTRL +` and `CTRL -`) so that three graph boxes fit completely. Click
the green "RUN MODEL" button. The first run may take 5-10 seconds, but subsequent runs should be
virtually instantaneous.

## Usage tips

You can scroll among the many output figures by clicking the little arrows at the left and right side of
the screen, by clicking the little dots under the figure, or by left and right arrows on your keyboard.

Usually you start by setting the base scenario in the dropdown menu on the left. This will determine
which scenario to use for fossil CO<sub>2</sub> emissions, "other" CO<sub>2</sub> emissions (mostly 
land use change from deforestation), and emissions of methane and nitrous oxide. Then you can click
on the fossil CO<sub>2</sub> emissions figure to enter "edit mode". This will magnify the figure and
switch to a view with breakpoints along the emission curve. These can be dragged to interactively
design an alternate emission pathway. Then click anywhere on the figure to exit edit mode.

Then set a value for the climate sensitivity using the slider in the middle and click "run model".
The figures will update, and you'll get a new entry for that run in the log on the right. The log
will let you temporily hide individual runs, delete them or clear everything.

### Bug note

Dragging the breakpoints in the fossil CO<sub>2</sub> emissions figure may sometimes stop working. As a
temporary workaround, try clicking the "Fix" button in the upper right corner to make dragging work again.

### Advanced mode

Click the cogwheel in the upper right to find the toggle for advanced mode. In advanced mode, you can
design individual CO<sub>2</sub> emission pathways for major regions of the world. In a future version of
ClimateCalculator you will be able to design pathways for methane and nitrous oxide as well but this
feature has not yet been enabled. (But you can currently select alternative pathways for
non-CO<sub>2</sub> gases according to preset SSP scenarios using the dropdown menu "Base scenario".)

## How the model works - simplified graphical representation
![Simplified graphical representation](https://github.com/niclasmattsson/ClimateCalculator/blob/master/CCCsimple.png)

## Full graphical representation including feedbacks
![Full graphical representation](https://github.com/niclasmattsson/ClimateCalculator/blob/master/CCCfull.png)

## Model documentation

To do.
