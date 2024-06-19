## E&W Census2021 Tables
This document provides the schema documentation for the demographic tables, including a detailed description of each table and its associated metadata. The tables are categorized based on the Census 2021 estimates and cover various demographic aspects.

# Source
ONS

# Table Code <> Description Mapping
TS001: Number of usual residents in households and communal establishments
TS002: Legal partnership status
TS003: Household composition
TS004: Country of birth
TS005: Passports held
TS006: Population density
TS007: Age by single year of age
TS007A: Age by five-year age bands
TS008: Sex
TS009: Sex by single year of age
TS010: Living arrangements
TS011: Households by deprivation dimensions
TS012: Country of birth (detailed)
TS013: Passports held (detailed)
TS015: Year of arrival in UK
TS016: Length of residence
TS017: Household size
TS018: Age of arrival in the UK
TS019: Migrant Indicator
TS020: Number of non-UK short-term residents by sex
TS041: Number of Households

## ew_geographies
# Description:
The ew_geographies table contains geographical information for various levels of hierarchy within England and Wales. It includes information from the most granular level (Output Areas) to the broader regions and nations.

# Source:
ONS

# Columns:

pcd (VARCHAR): Postcode.
gridgb1e (VARCHAR): Grid reference easting.
gridgb1n (VARCHAR): Grid reference northing.
oa21cd (VARCHAR): Output Area 2021 code.
lsoa21cd (VARCHAR): Lower Layer Super Output Area 2021 code.
lsoa21nm (VARCHAR): Lower Layer Super Output Area 2021 name.
msoa21cd (VARCHAR): Middle Layer Super Output Area 2021 code.
msoa21nm (VARCHAR): Middle Layer Super Output Area 2021 name.
ltla22cd (VARCHAR): Lower Tier Local Authority 2022 code.
ltla22nm (VARCHAR): Lower Tier Local Authority 2022 name.
ltla22nmw (VARCHAR): Lower Tier Local Authority 2022 name (Welsh).
utla22cd (VARCHAR): Upper Tier Local Authority 2022 code.
utla22nm (VARCHAR): Upper Tier Local Authority 2022 name.
utla22nmw (VARCHAR): Upper Tier Local Authority 2022 name (Welsh).
rgn22cd (VARCHAR): Region 2022 code.
rgn22nm (VARCHAR): Region 2022 name.
rgn22nmw (VARCHAR): Region 2022 name (Welsh).
ctry22cd (VARCHAR): Country 2022 code.
ctry22nm (VARCHAR): Country 2022 name.
ctry22nmw (VARCHAR): Country 2022 name (Welsh).
nat22cd (VARCHAR): Nation 2022 code.
nat22nm (VARCHAR): Nation 2022 name.
nat22nmw (VARCHAR): Nation 2022 name (Welsh).
Primary Key:

Composite key consisting of oa21cd and oa21nm.
# Partitions:

ew_geographies_region1: Partition for North East (rgn22cd = 'E12000001').
ew_geographies_region2: Partition for North West (rgn22cd = 'E12000002').
ew_geographies_region3: Partition for Yorkshire and The Humber (rgn22cd = 'E12000003').
ew_geographies_region4: Partition for East Midlands (rgn22cd = 'E12000004').
ew_geographies_region5: Partition for West Midlands (rgn22cd = 'E12000005').
ew_geographies_region6: Partition for East of England (rgn22cd = 'E12000006').
ew_geographies_region7: Partition for London (rgn22cd = 'E12000007').
ew_geographies_region8: Partition for South East (rgn22cd = 'E12000008').
ew_geographies_region9: Partition for South West (rgn22cd = 'E12000009').
ew_geographies_region10: Partition for Wales (rgn22cd = 'E12000010').
Indexes:

idx_oa21cd_region1: Index on oa21cd for the North East partition.
idx_oa21cd_region2: Index on oa21cd for the North West partition.
idx_oa21cd_region3: Index on oa21cd for the Yorkshire and The Humber partition.
idx_oa21cd_region4: Index on oa21cd for the East Midlands partition.
idx_oa21cd_region5: Index on oa21cd for the West Midlands partition.
idx_oa21cd_region6: Index on oa21cd for the East of England partition.
idx_oa21cd_region7: Index on oa21cd for the London partition.
idx_oa21cd_region8: Index on oa21cd for the South East partition.
idx_oa21cd_region9: Index on oa21cd for the South West partition.
idx_oa21cd_region10: Index on oa21cd for the Wales partition.

## ew_political_boundaries
ONS

## sc_geographies
Scotlandcensus

## SC Census Tables
Scotlandcensus

## election_results
https://commonslibrary.parliament.uk/research-briefings/cbp-8647/#fullreport

The data includes the following boundary sets and identifying codes:

1918-1935: identifiers from the source data (not including Ireland, Northern Ireland and University seats)
1945: identifiers from the source data (not including Northern Ireland and University seats)
1950-1951: identifiers from the source data
1955-1970: Press Association codes from the source data
1974-1979: Press Association codes from the source data
1983-1992: NOMIS codes. Note that for the 1992 General Election, Milton Keynes was split into two constituencies (coded 17 and 17.5). All other boundaries remained the same
1997-2001: PCA codes
2005: PCA codes for England, Wales and Northern Ireland; ONS codes for Scotland. For comparison purposes, Scottish constituencies can be compared with the 2010-2017 set, while all other constituencies can be compared with the 1997-2001 set
2010-2019: ONS codes

##

# Country hierarchies
SC

ctry (1)
council area (Local Authority), CA2019 (32)
locality,  (629)
- CLOC2022 (657)
data zone 2011, DZ2011 (6976)
output area, OA2022 (46,351)

Find lookups here: https://www.nrscotland.gov.uk/statistics-and-data/geography/our-products/census-datasets/2022-census/2022-census-indexes


E&W
ctry (2)
Region
UTLA
LTLA
MSOA
LSOA
OA