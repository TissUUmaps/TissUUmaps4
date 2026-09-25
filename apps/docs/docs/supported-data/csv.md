---
sidebar_position: 6
---

# CSV

## Column types

A column whose cells all hold numbers is read as 32-bit floats, with blank cells as `NaN`. Any other cell makes the column a string column. The `idColumn` is read as integers if every cell holds one, and as strings otherwise; a blank ID fails the load.
