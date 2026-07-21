# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\transport-early-arrival-ui.spec.ts >> Hotel + Transport early check-in confirmation >> explains previous-night room blocking and exposes explicit actions
- Location: tests\e2e\smoke\transport-early-arrival-ui.spec.ts:111:3

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for getByRole('option').first()

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - complementary [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - generic [ref=e8]:
            - img "DoView Holidays" [ref=e9]
            - generic [ref=e10]: DoView Holidays
          - button "●" [ref=e11] [cursor=pointer]
        - navigation [ref=e12]:
          - list [ref=e13]:
            - listitem [ref=e14]:
              - link "Dashboard" [ref=e15] [cursor=pointer]:
                - /url: /
                - img [ref=e16]
                - generic [ref=e19]: Dashboard
            - listitem [ref=e20]:
              - link "Create Itinerary" [ref=e21] [cursor=pointer]:
                - /url: /create-itinerary
                - img [ref=e22]
                - generic [ref=e25]: Create Itinerary
            - listitem [ref=e26]:
              - link "Download Packages" [ref=e27] [cursor=pointer]:
                - /url: /download-packages
                - img [ref=e28]
                - generic [ref=e31]: Download Packages
            - listitem [ref=e32]:
              - link "Latest Itinerary" [ref=e33] [cursor=pointer]:
                - /url: /latest-itinerary
                - img [ref=e34]
                - generic [ref=e37]: Latest Itinerary
            - listitem [ref=e38]:
              - link "Confirmed Itinerary" [ref=e39] [cursor=pointer]:
                - /url: /confirmed-itinerary
                - img [ref=e40]
                - generic [ref=e43]: Confirmed Itinerary
            - listitem [ref=e44]:
              - link "Book Activities" [ref=e45] [cursor=pointer]:
                - /url: /book-activities
                - img [ref=e46]
                - generic [ref=e49]: Book Activities
            - listitem [ref=e50]:
              - button "Accounts" [ref=e51] [cursor=pointer]:
                - img [ref=e52]
                - generic [ref=e55]: Accounts
                - img [ref=e56]
            - listitem [ref=e58]:
              - link "Hotels" [ref=e59] [cursor=pointer]:
                - /url: /hotels
                - img [ref=e60]
                - generic [ref=e63]: Hotels
            - listitem [ref=e64]:
              - link "AxisRooms Hotels" [ref=e65] [cursor=pointer]:
                - /url: /hotels/axisrooms
                - img [ref=e66]
                - generic [ref=e69]: AxisRooms Hotels
            - listitem [ref=e70]:
              - link "Daily Moment Tracker" [ref=e71] [cursor=pointer]:
                - /url: /daily-moment
                - img [ref=e72]
                - generic [ref=e75]: Daily Moment Tracker
            - listitem [ref=e76]:
              - button "Vendor Management" [ref=e77] [cursor=pointer]:
                - img [ref=e78]
                - generic [ref=e83]: Vendor Management
                - img [ref=e84]
            - listitem [ref=e86]:
              - button "Hotspot" [ref=e87] [cursor=pointer]:
                - img [ref=e88]
                - generic [ref=e91]: Hotspot
                - img [ref=e92]
            - listitem [ref=e94]:
              - link "Activity" [ref=e95] [cursor=pointer]:
                - /url: /activities
                - img [ref=e96]
                - generic [ref=e99]: Activity
            - listitem [ref=e100]:
              - button "Locations" [ref=e101] [cursor=pointer]:
                - img [ref=e102]
                - generic [ref=e105]: Locations
                - img [ref=e106]
            - listitem [ref=e108]:
              - link "Guide" [ref=e109] [cursor=pointer]:
                - /url: /guide
                - img [ref=e110]
                - generic [ref=e115]: Guide
            - listitem [ref=e116]:
              - link "Staff" [ref=e117] [cursor=pointer]:
                - /url: /staff
                - img [ref=e118]
                - generic [ref=e123]: Staff
            - listitem [ref=e124]:
              - link "Agent" [ref=e125] [cursor=pointer]:
                - /url: /agent
                - img [ref=e126]
                - generic [ref=e131]: Agent
            - listitem [ref=e132]:
              - link "Pricebook Export" [ref=e133] [cursor=pointer]:
                - /url: /pricebook-export
                - img [ref=e134]
                - generic [ref=e137]: Pricebook Export
            - listitem [ref=e138]:
              - button "Settings" [ref=e139] [cursor=pointer]:
                - img [ref=e140]
                - generic [ref=e143]: Settings
                - img [ref=e144]
        - generic [ref=e147]:
          - generic [ref=e148]: A
          - generic [ref=e149]:
            - paragraph [ref=e150]: AdminDvi
            - paragraph [ref=e151]: Super Admin
    - generic [ref=e152]:
      - generic [ref=e155]:
        - heading "Create Itinerary" [level=4] [ref=e157]
        - generic [ref=e158]:
          - navigation "breadcrumb" [ref=e159]:
            - list [ref=e160]:
              - listitem [ref=e161]:
                - button "Dashboard" [ref=e162] [cursor=pointer]:
                  - text: Dashboard
                  - img [ref=e163]
          - button "Logout" [ref=e165] [cursor=pointer]
      - main [ref=e166]:
        - generic [ref=e168]:
          - generic [ref=e171]:
            - generic [ref=e172]:
              - generic [ref=e173]:
                - generic [ref=e174]: Itinerary Preference *
                - radiogroup [ref=e175]:
                  - generic [ref=e176]:
                    - radio "Vehicle" [ref=e177] [cursor=pointer]
                    - text: Vehicle
                  - generic [ref=e178]:
                    - radio "Hotel" [ref=e179] [cursor=pointer]
                    - text: Hotel
                  - generic [ref=e180]:
                    - radio "Both Hotel and Vehicle" [checked] [ref=e181] [cursor=pointer]:
                      - img [ref=e183]
                    - text: Both Hotel and Vehicle
              - generic [ref=e185]:
                - generic [ref=e186]: Agent *
                - generic [ref=e187]:
                  - button "Select Agent" [ref=e188] [cursor=pointer]:
                    - generic [ref=e189]: Select Agent
                    - img [ref=e190]
                  - generic [ref=e192]:
                    - textbox "Type to search..." [active] [ref=e193]
                    - generic [ref=e194]:
                      - generic [ref=e196] [cursor=pointer]: AIR VISION TOURS &amp; TRAVELS - Chennai
                      - generic [ref=e198] [cursor=pointer]: DVI Holidays - Zaranj
                      - generic [ref=e200] [cursor=pointer]: DVI Holidays - Albanien
                      - generic [ref=e202] [cursor=pointer]: DVI Holidays - Shimla
                      - generic [ref=e204] [cursor=pointer]: DVI Holidays - Uruzgan
                      - generic [ref=e206] [cursor=pointer]: DVI Holidays - Chennai
                      - generic [ref=e208] [cursor=pointer]: DVI Holidays - Chennai
                      - generic [ref=e210] [cursor=pointer]: Nagappan DVI Holidays - Chennai
                      - generic [ref=e212] [cursor=pointer]: STAR TOURS AND TRAVELS - Kanpur
                      - generic [ref=e214] [cursor=pointer]: Easy India Tour - New Delhi
                      - generic [ref=e216] [cursor=pointer]: Global Travel Services - Aligarh
                      - generic [ref=e218] [cursor=pointer]: Wonder Journeys - Urgoon
                      - generic [ref=e220] [cursor=pointer]: worlsolutionindia - Lucknow
                      - generic [ref=e222] [cursor=pointer]: Pristel Lifestyle Services - Bengaluru
                      - generic [ref=e224] [cursor=pointer]: AVIKA TOUR AND TRAVEL - Unnao
                      - generic [ref=e226] [cursor=pointer]: A I TOURS AND TRAVELS - Taluqan
                      - generic [ref=e228] [cursor=pointer]: Mryatra.com - Lucknow
                      - generic [ref=e230] [cursor=pointer]: Pan India Holidays - Shimla
                      - generic [ref=e232] [cursor=pointer]: BARADIA HOLIDAYS PRIVATE LIMITED - Chennai
                      - generic [ref=e234] [cursor=pointer]: SHYAM RAIL TRAVELS SERVIE AGENT - Mazar I Sharif
                      - generic [ref=e236] [cursor=pointer]: HYGEE TRAVEL CONCIERGE - Bengaluru
                      - generic [ref=e238] [cursor=pointer]: Spedizone Travels - Mohali
                      - generic [ref=e240] [cursor=pointer]: TRAVEL HUB - Varanasi
                      - generic [ref=e242] [cursor=pointer]: FREELANCE TOURISM - Rajahmundry
                      - generic [ref=e244] [cursor=pointer]: WayCay - Mumbai
                      - generic [ref=e246] [cursor=pointer]: CLUB TOURS ONLINE - Maimana
                      - generic [ref=e248] [cursor=pointer]: AKBAR HOLIDAYS PVT LTD - Maimana
                      - generic [ref=e250] [cursor=pointer]: Make my trip - Kochi
                      - generic [ref=e252] [cursor=pointer]: Vianest Journeys - Ahmedabad
                      - generic [ref=e254] [cursor=pointer]: TRAVEL SIGHT OVERSEAS - Panchkula
                      - generic [ref=e256] [cursor=pointer]: DINESH HOLIDAYS TOURS &amp; tRAVELS - Mumbai
                      - generic [ref=e258] [cursor=pointer]: Colors of India Tours Pvt Ltd - Shimla
                      - generic [ref=e260] [cursor=pointer]: Arihant Holidays - Navsari
                      - generic [ref=e262] [cursor=pointer]: YATRA UNLIMITED - Kunduz
                      - generic [ref=e264] [cursor=pointer]: TRAVELFINNA HOLIDAYS - Chandigarh
                      - generic [ref=e266] [cursor=pointer]: NEW WINDOWS OF THE WORLD LLP - Chandigarh
                      - generic [ref=e268] [cursor=pointer]: Simply India Holidays - Lucknow
                      - generic [ref=e270] [cursor=pointer]: BBN TRAVEL SERVICES - Jalandhar
                      - generic [ref=e272] [cursor=pointer]: Ticket to Travel - Surat
                      - generic [ref=e274] [cursor=pointer]: SK TOURS - Banswara
                      - generic [ref=e276] [cursor=pointer]: Holiday mechanic - New Delhi
                      - generic [ref=e278] [cursor=pointer]: EBIX Travels Pvt. ltd. - via.com - New Delhi
                      - generic [ref=e280] [cursor=pointer]: Ticket to Travel - Surat
                      - generic [ref=e282] [cursor=pointer]: AMIT - Khost
                      - generic [ref=e284] [cursor=pointer]: Parvati Tours &amp; Travels - Surat
                      - generic [ref=e286] [cursor=pointer]: Yatra.com - Kandahar
                      - generic [ref=e288] [cursor=pointer]: LUXURY TRIPS - Panchkula
                      - generic [ref=e290] [cursor=pointer]: TravelBite - Ahmedabad
                      - generic [ref=e292] [cursor=pointer]: Hirola Tours - Surat
                      - generic [ref=e294] [cursor=pointer]: HIROLA TOURS - Surat
                      - generic [ref=e296] [cursor=pointer]: EaseMyTrip - Noida
                      - generic [ref=e298] [cursor=pointer]: JR Tour Nd Travels - Surat
                      - generic [ref=e300] [cursor=pointer]: Agarwal Tours And Travels - Mumbai
                      - generic [ref=e302] [cursor=pointer]: epic holidays - Rajkot
                      - generic [ref=e304] [cursor=pointer]: travel to world - Hyderabad
                      - generic [ref=e306] [cursor=pointer]: J M TRAVELS - Surat
                      - generic [ref=e308] [cursor=pointer]: Roshni Shiv Travels - Surat
                      - generic [ref=e310] [cursor=pointer]: R TRAVEL WORLD - Herat
                      - generic [ref=e312] [cursor=pointer]: M J Tours And Travels - Gardez
                      - generic [ref=e314] [cursor=pointer]: Delight Holidays - Ahmedabad
                      - generic [ref=e316] [cursor=pointer]: AKASH TRAVELS - Ahmedabad
                      - generic [ref=e318] [cursor=pointer]: Fortune Holidays - Rajkot
                      - generic [ref=e320] [cursor=pointer]: TRAMPER INDIA - Faizabad
                      - generic [ref=e322] [cursor=pointer]: Happy Journey Tours &amp; travels - Mandvi
                      - generic [ref=e324] [cursor=pointer]: MATRIX TOUR AND TRAVELS - Ahmedabad
                      - generic [ref=e326] [cursor=pointer]: Mukes Tours n Travels - Ahmedabad
                      - generic [ref=e328] [cursor=pointer]: Z Star Holidays Private Limited - Varanasi
                      - generic [ref=e330] [cursor=pointer]: AVIAN EXPERIENCES PRIVATE LIMITED - Ahmedabad
                      - generic [ref=e332] [cursor=pointer]: Vibrant Holidays - Ahmedabad
                      - generic [ref=e334] [cursor=pointer]: THE TRAVEL PROJECT - Rajkot
                      - generic [ref=e336] [cursor=pointer]: Moj Holidays - Godhra
                      - generic [ref=e338] [cursor=pointer]: SONU HOLIDAYS - Mumbai
                      - generic [ref=e340] [cursor=pointer]: TRAVEL XPERT VACATIONS PVT. LTD - Jalandhar
                      - generic [ref=e342] [cursor=pointer]: PARTH HOLIDAYS PVT.LTD - Jalandhar
                      - generic [ref=e344] [cursor=pointer]: GlobMiles Holidays - Jaipur
                      - generic [ref=e346] [cursor=pointer]: prestige Travel - Jaipur
                      - generic [ref=e348] [cursor=pointer]: Holidayz Boutique PVT LTD - Jaipur
                      - generic [ref=e350] [cursor=pointer]: Palecha Tours and Travels - Jaipur
                      - generic [ref=e352] [cursor=pointer]: Holidays unlimited - Jaipur
                      - generic [ref=e354] [cursor=pointer]: NAVEEN TOURS &amp; HOLIDAYS - Jaipur
                      - generic [ref=e356] [cursor=pointer]: Evergreen Travels - Chandigarh
                      - generic [ref=e358] [cursor=pointer]: FARAWAY TRAVELS - Chakcharan
                      - generic [ref=e360] [cursor=pointer]: OP IMPEX INTERNATIONAL/HOLIDAY 3SIXTY - Agra
                      - generic [ref=e362] [cursor=pointer]: Piyush Tours &amp; Travel - Talegaon Dabhade
                      - generic [ref=e364] [cursor=pointer]: Wow Holidays - Agra
                      - generic [ref=e366] [cursor=pointer]: PRATHAM VACATION PVT LTD - Bost
                      - generic [ref=e368] [cursor=pointer]: IV HOLIDAYS - Chandigarh
                      - generic [ref=e370] [cursor=pointer]: Mannu Holidays - Bamiyan
                      - generic [ref=e372] [cursor=pointer]: Exotic India Vacations - Jammu
                      - generic [ref=e374] [cursor=pointer]: Akbar Travels of India Pvt Ltd - Lucknow
                      - generic [ref=e376] [cursor=pointer]: travel n Survey advisory Of India - Lucknow
                      - generic [ref=e378] [cursor=pointer]: umatds - Chennai
                      - generic [ref=e380] [cursor=pointer]: umatds - Chennai
                      - generic [ref=e382] [cursor=pointer]: umatds - Chennai
                      - generic [ref=e384] [cursor=pointer]: VFL TRAVEL SERVICES PVT LTD - Kanpur
                      - generic [ref=e386] [cursor=pointer]: TRAVEL GANESHA PVT LTD - Kanpur
                      - generic [ref=e388] [cursor=pointer]: Touchmark - Chennai
                      - generic [ref=e390] [cursor=pointer]: Travel N Survey Advisory Of India - Lucknow
                      - generic [ref=e392] [cursor=pointer]: Touchmark - Chennai
                      - generic [ref=e394] [cursor=pointer]: Touchmark - Chennai
                      - generic [ref=e396] [cursor=pointer]: Touchmark - Chennai
                      - generic [ref=e398] [cursor=pointer]: uma - Chennai
                      - generic [ref=e400] [cursor=pointer]: Travel N Survey Advisory Of India - LUCKN
                      - generic [ref=e402] [cursor=pointer]: R I ASSOCIATES - Kanpur
                      - generic [ref=e404] [cursor=pointer]: Star Comfort Tours and travels - Chennai
                      - generic [ref=e406] [cursor=pointer]: Cawnpore&#039;s A A Travel Wings Pvt. Ltd. - Kanpur
                      - generic [ref=e408] [cursor=pointer]: STA TRAVEL - Kanpur
                      - generic [ref=e410] [cursor=pointer]: GOTICKETGURU - Kanpur
                      - generic [ref=e412] [cursor=pointer]: EWTC WORLD TOURISM CENTRE PVT LTD - VARANAS
                      - generic [ref=e414] [cursor=pointer]: SPYTA HOLIDAYS - Varanasi
                      - generic [ref=e416] [cursor=pointer]: NAVIGATE INTERNATIONAL - Gorakhpur
                      - generic [ref=e418] [cursor=pointer]: MS ROYAL TOUR &amp; TRAVELS INDIA PVT LTD - Gorakhpur
                      - generic [ref=e420] [cursor=pointer]: HOPFUN HOLIDAYS - Gorakhpur
                      - generic [ref=e422] [cursor=pointer]: Get Set Travel - Gorakhpur
                      - generic [ref=e424] [cursor=pointer]: TULIP TRAVEL INDIA (A UNIT OF HITMILLIONS SALES AND SERVICES LTD) - Varanasi
                      - generic [ref=e426] [cursor=pointer]: TRAVEL AROUND GLOBE - Kanpur
                      - generic [ref=e428] [cursor=pointer]: Ezeegotrip.com - Lucknow
                      - generic [ref=e430] [cursor=pointer]: R J TRADE WINGS PVT LTD - Lucknow
                      - generic [ref=e432] [cursor=pointer]: Plan A Ticket Pvt Ltd - LU
                      - generic [ref=e434] [cursor=pointer]: RIVOTRIP HOLIDAYS LLP - Lucknow
                      - generic [ref=e436] [cursor=pointer]: Swiggy - Beng
                      - generic [ref=e438] [cursor=pointer]: TRAVEL IDEAS - Lucknow
                      - generic [ref=e440] [cursor=pointer]: subh yatra travels - Lucknow
                      - generic [ref=e442] [cursor=pointer]: Yog Tours and Travels - Hubballi
                      - generic [ref=e444] [cursor=pointer]: Mansa International Tours and Travels - Lucknow
                      - generic [ref=e446] [cursor=pointer]: MY WAY HOLIDAYS - Lucknow
                      - generic [ref=e448] [cursor=pointer]: Saga Luxury Tours &amp; Travels Pvt LTD - Lucknow
                      - generic [ref=e450] [cursor=pointer]: Swiggy - Bengaluru
                      - generic [ref=e452] [cursor=pointer]: Gaon Trip - Kullu
                      - generic [ref=e454] [cursor=pointer]: Edterra Edventures Pvt Ltd - New Delhi
                      - generic [ref=e456] [cursor=pointer]: Airwalk - Lucknow
                      - generic [ref=e458] [cursor=pointer]: getsetgoholiday - Nagpur
                      - generic [ref=e460] [cursor=pointer]: Hargobind Travels - Chandigarh
                      - generic [ref=e462] [cursor=pointer]: JASH HOLIDAYS - Mumbai
                      - generic [ref=e464] [cursor=pointer]: Paradise Tours &amp; Travels - Ghaziaba
                      - generic [ref=e466] [cursor=pointer]: Uttrakhand tour &amp; travels - Ramnagar
                      - generic [ref=e468] [cursor=pointer]: TRAVELOBOT SERVICES PVT LTD - Chandigarh
                      - generic [ref=e470] [cursor=pointer]: NEXTTRIPHOLIDAYS - Kanpur
                      - generic [ref=e472] [cursor=pointer]: DREAM EXPLORER - Lucknow
                      - generic [ref=e474] [cursor=pointer]: Saggar World Holidays - Ludhiana
                      - generic [ref=e476] [cursor=pointer]: DVI HOLIDAYS - Chennai
                      - generic [ref=e478] [cursor=pointer]: DK TRAVELS - Ghaziabad
                      - generic [ref=e480] [cursor=pointer]: DVi holidays - Chennai
                      - generic [ref=e482] [cursor=pointer]: mtm holidays - Bhiwandi, Maharashtra, India
                      - generic [ref=e484] [cursor=pointer]: Window seat holidays - Dehra
                      - generic [ref=e486] [cursor=pointer]: umae - Chennai
                      - generic [ref=e488] [cursor=pointer]: Vaishno Travel Solution - Katra
                      - generic [ref=e490] [cursor=pointer]: Swiggy - Bangalore
                      - generic [ref=e492] [cursor=pointer]: explore holidays india - East delhi
                      - generic [ref=e494] [cursor=pointer]: Happpy Holidays - Ahmedabad
                      - generic [ref=e496] [cursor=pointer]: TRAVEL AROUND GLOBE - Kanpur
                      - generic [ref=e498] [cursor=pointer]: DVi - Cehnn
                      - generic [ref=e500] [cursor=pointer]: Travelepedia - Faridabad
                      - generic [ref=e502] [cursor=pointer]: SMH Holidats - Lucknow
                      - generic [ref=e504] [cursor=pointer]: SMH HOLIDAYS - Lucknow
                      - generic [ref=e506] [cursor=pointer]: Mturn Tourism Company
                      - generic [ref=e508] [cursor=pointer]: Top Travel &amp; Tours (P) LTD.
                      - generic [ref=e510] [cursor=pointer]: VARAD HOLIDAYS
                      - generic [ref=e512] [cursor=pointer]: Navkar Tours And Travels
                      - generic [ref=e514] [cursor=pointer]: Corals Vista
                      - generic [ref=e516] [cursor=pointer]: TEJI TRAVEL WORLD
                      - generic [ref=e518] [cursor=pointer]: Omkar Holidays
                      - generic [ref=e520] [cursor=pointer]: Delight Himachal Holiday
                      - generic [ref=e522] [cursor=pointer]: SPS
                      - generic [ref=e524] [cursor=pointer]: Arsh Tours &amp; Travels - --
                      - generic [ref=e526] [cursor=pointer]: Make My Trip - --
                      - generic [ref=e528] [cursor=pointer]: Discover Leisure Tours and Travels Pvt.Ltd. - Delhi
                      - generic [ref=e530] [cursor=pointer]: Rahagir Travels
                      - generic [ref=e532] [cursor=pointer]: YASHRAJ TOUR AND TRAVELS
                      - generic [ref=e534] [cursor=pointer]: Relaxia Holiday
                      - generic [ref=e536] [cursor=pointer]: The Happy Travels
                      - generic [ref=e538] [cursor=pointer]: Exotic Travels and Holidays P Ltd
                      - generic [ref=e540] [cursor=pointer]: Vats travels solutions
                      - generic [ref=e542] [cursor=pointer]: Tripocio carnival Pvt LTd
                      - generic [ref=e544] [cursor=pointer]: Suvidha Travel
                      - generic [ref=e546] [cursor=pointer]: RAVI AIR TRAVELS PVT LTD
                      - generic [ref=e548] [cursor=pointer]: Kafila Hospitality &amp; Travels Pvt. Ltd.
                      - generic [ref=e550] [cursor=pointer]: Masti Holiday
                      - generic [ref=e552] [cursor=pointer]: Safal India Holiday
                      - generic [ref=e554] [cursor=pointer]: TRAVEL CLUB
                      - generic [ref=e556] [cursor=pointer]: Namaskar Holidays
                      - generic [ref=e558] [cursor=pointer]: LUXTRIPPER HOLIDAYS PVT LTD
                      - generic [ref=e560] [cursor=pointer]: THE MAJESTIC TOURS &amp; TRAVELS
                      - generic [ref=e562] [cursor=pointer]: Vaibhavi Tours and Travels
                      - generic [ref=e564] [cursor=pointer]: Travel Solutions
                      - generic [ref=e566] [cursor=pointer]: Travel Connection
                      - generic [ref=e568] [cursor=pointer]: PALM OCEANOS TRAVELS &amp; HOLIDAYS
                      - generic [ref=e570] [cursor=pointer]: Travel Bridge Online
                      - generic [ref=e572] [cursor=pointer]: Imperial Jaipur
                      - generic [ref=e574] [cursor=pointer]: Make My Trip India Pvt Ltd
                      - generic [ref=e576] [cursor=pointer]: Travel Explorers India
                      - generic [ref=e578] [cursor=pointer]: tripsters holidays
                      - generic [ref=e580] [cursor=pointer]: Himalayan yatra &amp; Adventure
                      - generic [ref=e582] [cursor=pointer]: travel outlet india
                      - generic [ref=e584] [cursor=pointer]: GULATI SERVICES
                      - generic [ref=e586] [cursor=pointer]: VENUS TRAVELS
                      - generic [ref=e588] [cursor=pointer]: Zourney.In
                      - generic [ref=e590] [cursor=pointer]: Siddhivinayak Leisure Holidays
                      - generic [ref=e592] [cursor=pointer]: Southern Travels pvt ltd
                      - generic [ref=e594] [cursor=pointer]: Vizag Tourism
                      - generic [ref=e596] [cursor=pointer]: The Solution Maker
                      - generic [ref=e598] [cursor=pointer]: VR Excursions Pvt Ltd
                      - generic [ref=e600] [cursor=pointer]: HOLIDAYS BOOKERS DMC INDIA PVT. LTD.
                      - generic [ref=e602] [cursor=pointer]: The Trip House
                      - generic [ref=e604] [cursor=pointer]: TRAVELGARH.COM
                      - generic [ref=e606] [cursor=pointer]: SANDAL TRAVELS PVT LTD
                      - generic [ref=e608] [cursor=pointer]: ALR AVIATIONS PVT LTD
                      - generic [ref=e610] [cursor=pointer]: cheap prime Fares
                      - generic [ref=e612] [cursor=pointer]: Travel Cloud Pvtltd
                      - generic [ref=e614] [cursor=pointer]: DAYS HOLIDAY
                      - generic [ref=e616] [cursor=pointer]: Anuj
                      - generic [ref=e618] [cursor=pointer]: VISHAL
                      - generic [ref=e620] [cursor=pointer]: PARMINDER SINGH
                      - generic [ref=e622] [cursor=pointer]: Amit
                      - generic [ref=e624] [cursor=pointer]: kulraj singh
                      - generic [ref=e626] [cursor=pointer]: Sagar
                      - generic [ref=e628] [cursor=pointer]: Rajesh
                      - generic [ref=e630] [cursor=pointer]: HARIPRASAD
                      - generic [ref=e632] [cursor=pointer]: Dhrupen
                      - generic [ref=e634] [cursor=pointer]: farman
                      - generic [ref=e636] [cursor=pointer]: Rajendran
                      - generic [ref=e638] [cursor=pointer]: pankaj
                      - generic [ref=e640] [cursor=pointer]: Viacation Tourism Pvt Ltd
                      - generic [ref=e642] [cursor=pointer]: Srinivas
                      - generic [ref=e644] [cursor=pointer]: Vinod
                      - generic [ref=e646] [cursor=pointer]: SHIBASHIS
                      - generic [ref=e648] [cursor=pointer]: Suparna
                      - generic [ref=e650] [cursor=pointer]: Sumit
                      - generic [ref=e652] [cursor=pointer]: Hemchandra
                      - generic [ref=e654] [cursor=pointer]: Mahtab
                      - generic [ref=e656] [cursor=pointer]: Srinivas
                      - generic [ref=e658] [cursor=pointer]: Sam
                      - generic [ref=e660] [cursor=pointer]: POGAKU
                      - generic [ref=e662] [cursor=pointer]: suraj
                      - generic [ref=e664] [cursor=pointer]: SOBBI
                      - generic [ref=e666] [cursor=pointer]: drushya
                      - generic [ref=e668] [cursor=pointer]: HARISHBABU
                      - generic [ref=e670] [cursor=pointer]: RAM
                      - generic [ref=e672] [cursor=pointer]: Srikanth
                      - generic [ref=e674] [cursor=pointer]: SYED
                      - generic [ref=e676] [cursor=pointer]: Chandra Mohan
                      - generic [ref=e678] [cursor=pointer]: Shashank
                      - generic [ref=e680] [cursor=pointer]: Masiha
                      - generic [ref=e682] [cursor=pointer]: Amit
                      - generic [ref=e684] [cursor=pointer]: SHAH&#039;S
                      - generic [ref=e686] [cursor=pointer]: SHRAVANI
                      - generic [ref=e688] [cursor=pointer]: REJITH
                      - generic [ref=e690] [cursor=pointer]: vikas
                      - generic [ref=e692] [cursor=pointer]: Vikas
                      - generic [ref=e694] [cursor=pointer]: Manoj
                      - generic [ref=e696] [cursor=pointer]: Ajay
                      - generic [ref=e698] [cursor=pointer]: SANTHOSH
                      - generic [ref=e700] [cursor=pointer]: Rahul
                      - generic [ref=e702] [cursor=pointer]: Pratik
                      - generic [ref=e704] [cursor=pointer]: Sanjay
                      - generic [ref=e706] [cursor=pointer]: Travelstar
                      - generic [ref=e708] [cursor=pointer]: SAMEER
                      - generic [ref=e710] [cursor=pointer]: Janki - Jalalabad
                      - generic [ref=e712] [cursor=pointer]: Prachi
                      - generic [ref=e714] [cursor=pointer]: Venkatesh
                      - generic [ref=e716] [cursor=pointer]: Ram
                      - generic [ref=e718] [cursor=pointer]: Skyhawk
                      - generic [ref=e720] [cursor=pointer]: Happy
                      - generic [ref=e722] [cursor=pointer]: HIMANSHU
                      - generic [ref=e724] [cursor=pointer]: Safari
                      - generic [ref=e726] [cursor=pointer]: Prateek
                      - generic [ref=e728] [cursor=pointer]: Priyesh
                      - generic [ref=e730] [cursor=pointer]: GAURAV
                      - generic [ref=e732] [cursor=pointer]: Ashutosh
                      - generic [ref=e734] [cursor=pointer]: Vimal
                      - generic [ref=e736] [cursor=pointer]: Colourful Holidayss
                      - generic [ref=e738] [cursor=pointer]: PLACID
                      - generic [ref=e740] [cursor=pointer]: ankalamma
                      - generic [ref=e742] [cursor=pointer]: Justwravel
                      - generic [ref=e744] [cursor=pointer]: JENISHKUMAR
                      - generic [ref=e746] [cursor=pointer]: PARMANAND
                      - generic [ref=e748] [cursor=pointer]: Roshan Kumar
                      - generic [ref=e750] [cursor=pointer]: Eshwari
                      - generic [ref=e752] [cursor=pointer]: ANKIT
                      - generic [ref=e754] [cursor=pointer]: Srinivas
                      - generic [ref=e756] [cursor=pointer]: pavi
                      - generic [ref=e758] [cursor=pointer]: Dvi
                      - generic [ref=e760] [cursor=pointer]: Uma
                      - generic [ref=e762] [cursor=pointer]: Sunil - --
                      - generic [ref=e764] [cursor=pointer]: Uma
                      - generic [ref=e766] [cursor=pointer]: Arul
                      - generic [ref=e768] [cursor=pointer]: sandeep
                      - generic [ref=e770] [cursor=pointer]: Ariya Company
            - generic [ref=e771]:
              - generic [ref=e772]:
                - generic [ref=e773]: Arrival *
                - button "Choose Location" [ref=e775] [cursor=pointer]:
                  - generic [ref=e776]: Choose Location
                  - img [ref=e777]
              - generic [ref=e779]:
                - generic [ref=e780]: Departure *
                - button "Choose Location" [ref=e782] [cursor=pointer]:
                  - generic [ref=e783]: Choose Location
                  - img [ref=e784]
            - generic [ref=e786]:
              - generic [ref=e787]:
                - generic [ref=e788]: Hotel Category (Maximum 4 Only)*
                - button "Choose Category" [ref=e790] [cursor=pointer]:
                  - generic [ref=e791]: Choose Category
                  - img [ref=e792]
              - generic [ref=e794]:
                - generic [ref=e795]: Hotel Facilities (Optional)
                - button "Choose Hotel Facilities" [ref=e797] [cursor=pointer]:
                  - generic [ref=e798]: Choose Hotel Facilities
                  - img [ref=e799]
            - generic [ref=e801]:
              - generic [ref=e803]:
                - generic [ref=e804]: Trip Dates *
                - button "DD/MM/YYYY" [ref=e805] [cursor=pointer]:
                  - img
                  - text: DD/MM/YYYY
              - generic [ref=e806]:
                - generic [ref=e807]:
                  - generic [ref=e808]: Start Time *
                  - button "05:00 AM" [ref=e809] [cursor=pointer]:
                    - img
                    - text: 05:00 AM
                - generic [ref=e810]:
                  - generic [ref=e811]: End Time *
                  - button "12:00 PM" [ref=e812] [cursor=pointer]:
                    - img
                    - text: 12:00 PM
                - generic [ref=e813]:
                  - generic [ref=e814]: Itinerary Type *
                  - combobox [ref=e815] [cursor=pointer]:
                    - generic: Customize
                    - img [ref=e816]
            - generic [ref=e818]:
              - generic [ref=e819]:
                - generic [ref=e820]: Arrival Type *
                - combobox [ref=e821] [cursor=pointer]:
                  - generic: By Flight
                  - img [ref=e822]
              - generic [ref=e824]:
                - generic [ref=e825]: Number of Nights
                - spinbutton [ref=e826]: "0"
              - generic [ref=e827]:
                - generic [ref=e828]: Number of Days
                - spinbutton [ref=e829]: "1"
              - generic [ref=e830]:
                - generic [ref=e831]: Budget *
                - spinbutton [ref=e832]: "15000"
              - generic [ref=e833]:
                - generic [ref=e834]: Entry Ticket Required? *
                - combobox [ref=e835] [cursor=pointer]:
                  - generic: "No"
                  - img [ref=e836]
            - generic [ref=e839]:
              - generic [ref=e841]:
                - paragraph [ref=e842]: "#Room 1"
                - generic [ref=e843]:
                  - generic [ref=e844]:
                    - text: "[ Adult"
                    - generic [ref=e845]:
                      - generic [ref=e846]: 
                      - generic [ref=e847]: "Age: Above 11,"
                  - generic [ref=e848]:
                    - text: Child
                    - generic [ref=e849]:
                      - generic [ref=e850]: 
                      - generic [ref=e851]: "Age: 5 to 10,"
                  - generic [ref=e852]:
                    - text: Infant
                    - generic [ref=e853]:
                      - generic [ref=e854]: 
                      - generic [ref=e855]: "Age: Below 5"
                    - text: "]"
              - generic [ref=e856]:
                - generic [ref=e858]:
                  - button "-" [ref=e859] [cursor=pointer]
                  - generic [ref=e860]: "2"
                  - button "+" [ref=e861] [cursor=pointer]
                - button "+ Add Child" [ref=e863] [cursor=pointer]
                - button "+ Add Infant" [ref=e865] [cursor=pointer]
                - generic [ref=e866]:
                  - generic [ref=e867]: Total
                  - spinbutton [ref=e868]: "1"
                  - button "+ Add Rooms" [ref=e869] [cursor=pointer]:
                    - generic [ref=e870]:
                      - generic [ref=e871]: +
                      - text: Add Rooms
            - generic [ref=e872]:
              - generic [ref=e873]:
                - generic [ref=e874]: Guide for Whole Itinerary *
                - combobox [ref=e875] [cursor=pointer]:
                  - generic: "No"
                  - img [ref=e876]
              - generic [ref=e878]:
                - generic [ref=e879]: Nationality *
                - button "India" [ref=e881] [cursor=pointer]:
                  - generic [ref=e882]: India
                  - img [ref=e883]
              - generic [ref=e885]:
                - generic [ref=e886]: Food Preferences *
                - combobox [ref=e887] [cursor=pointer]:
                  - generic: Vegetarian
                  - img [ref=e888]
              - generic [ref=e890]:
                - generic [ref=e891]: Meal Plan
                - combobox [ref=e892] [cursor=pointer]:
                  - generic: All Meal Plans
                  - img [ref=e893]
            - generic [ref=e896]:
              - generic [ref=e897]: Special Instructions
              - textbox "Enter the Special Instruction" [ref=e898]
          - generic [ref=e900]:
            - heading "Route Details" [level=3] [ref=e902]
            - generic [ref=e903]:
              - table [ref=e905]:
                - rowgroup [ref=e914]:
                  - row "Day Travel Date From To Enroute Visits ⓘ Explore Destination ⓘ" [ref=e915]:
                    - columnheader "Day" [ref=e916]
                    - columnheader "Travel Date" [ref=e917]
                    - columnheader "From" [ref=e918]
                    - columnheader "To" [ref=e919]
                    - columnheader "Enroute Visits ⓘ" [ref=e920]
                    - columnheader "Explore Destination ⓘ" [ref=e921]
                    - columnheader [ref=e922]
                - rowgroup [ref=e923]:
                  - row "DAY 1 Next Destination " [ref=e924]:
                    - cell "DAY 1" [ref=e925]
                    - cell [ref=e926]:
                      - textbox "DD/MM/YYYY" [ref=e927]
                    - cell [ref=e928]:
                      - textbox "Source Location" [ref=e930]
                    - cell "Next Destination" [ref=e931]:
                      - button "Next Destination" [ref=e935] [cursor=pointer]:
                        - generic [ref=e936]: Next Destination
                        - img [ref=e937]
                    - cell "" [ref=e939]:
                      - button "" [ref=e940] [cursor=pointer]:
                        - generic [ref=e941]: 
                    - cell [ref=e942]:
                      - 'button "Explore Destination: Include local sightseeing and attractions after arriving at this destination." [ref=e944] [cursor=pointer]'
                    - cell [ref=e946]
              - button "+ Add Day" [ref=e947] [cursor=pointer]
          - generic [ref=e949]:
            - heading "Vehicle" [level=3] [ref=e951]
            - generic [ref=e952]:
              - generic [ref=e953]:
                - paragraph [ref=e955]: "Vehicle #1"
                - generic [ref=e956]:
                  - generic [ref=e957]:
                    - generic [ref=e958]: Vehicle Type *
                    - combobox [disabled] [ref=e959]:
                      - generic: Please Fill up the Route Details First
                      - img [ref=e960]
                  - generic [ref=e962]:
                    - generic [ref=e963]: Vehicle Count *
                    - spinbutton [ref=e964]: "1"
              - button "+ Add Vehicle" [ref=e965] [cursor=pointer]
          - button "Save & Continue" [ref=e967] [cursor=pointer]
      - contentinfo [ref=e968]:
        - generic [ref=e970]: DVI Holidays @ 2026
```

# Test source

```ts
  18  | 
  19  |   await page.getByRole('button', { name: 'Update Time' }).click();
  20  | }
  21  | 
  22  | async function chooseFirstLocation(
  23  |   page: import('@playwright/test').Page,
  24  |   field: 'arrivalLocation' | 'departureLocation',
  25  | ) {
  26  |   const locationField = page.locator(`[data-field="${field}"]`);
  27  |   await locationField.getByRole('button').click();
  28  |   await page.getByPlaceholder('Type to search...').press('Enter');
  29  | }
  30  | 
  31  | async function chooseTripDates(page: import('@playwright/test').Page) {
  32  |   const tripDatesField = page.locator('[data-field="tripStartDate"]').first();
  33  |   await tripDatesField.getByRole('button').first().click();
  34  |   const availableDays = page
  35  |     .locator('[role="gridcell"]:not([disabled])')
  36  |     .filter({ hasText: /^\d+$/ });
  37  |   await availableDays.first().click();
  38  |   await page
  39  |     .locator('[role="gridcell"]:not([disabled])')
  40  |     .filter({ hasText: /^\d+$/ })
  41  |     .nth(1)
  42  |     .click();
  43  | }
  44  | 
  45  | test.describe('Transport Only early-arrival preference', () => {
  46  |   test('opens the early-arrival preference popup, captures a selection, and closes', async ({ adminPage }, testInfo) => {
  47  |     await adminPage.goto('/create-itinerary', { waitUntil: 'domcontentloaded' });
  48  |     await expect(adminPage.getByText('Itinerary Preference *')).toBeVisible();
  49  | 
  50  |     await adminPage.getByRole('radio', { name: 'Vehicle', exact: true }).check();
  51  |     await setStartTime(adminPage, 6, 'AM');
  52  | 
  53  |     const preferenceDialog = adminPage.getByRole('dialog', {
  54  |       name: 'Early-morning arrival preference',
  55  |     });
  56  |     await expect(preferenceDialog).not.toBeVisible();
  57  | 
  58  |     await chooseFirstLocation(adminPage, 'arrivalLocation');
  59  |     await chooseFirstLocation(adminPage, 'departureLocation');
  60  |     await chooseTripDates(adminPage);
  61  |     await expect(preferenceDialog).toBeVisible();
  62  |     await preferenceDialog.getByRole('button', { name: 'Close' }).click();
  63  |     await expect(preferenceDialog).not.toBeVisible();
  64  | 
  65  |     await setStartTime(adminPage, 7, 'AM');
  66  |     await expect(preferenceDialog).toBeVisible();
  67  |     await expect(preferenceDialog).toContainText('Early-morning arrival preference');
  68  |     await expect(preferenceDialog).toContainText('before 08:00 AM');
  69  | 
  70  |     await expect(
  71  |       preferenceDialog.getByRole('button', { name: /Proceed directly to a hotel for freshening up and rest/i }),
  72  |     ).toBeVisible();
  73  |     await expect(
  74  |       preferenceDialog.getByRole('button', { name: /Take a refreshment or waiting break before sightseeing/i }),
  75  |     ).toBeVisible();
  76  | 
  77  |     await preferenceDialog.getByRole('button', { name: /Proceed directly to a hotel for freshening up and rest/i }).click();
  78  |     await expect(preferenceDialog.getByLabel('Hotel name (optional)')).toBeVisible();
  79  |     await preferenceDialog.getByLabel('Hotel name (optional)').fill('Guest Hotel');
  80  |     await expect(preferenceDialog).toContainText(
  81  |       'Guest has opted to proceed to the hotel first for rest and refreshment before commencing sightseeing.',
  82  |     );
  83  |     await adminPage.screenshot({
  84  |       path: testInfo.outputPath('transport-early-arrival-hotel-name-dialog.png'),
  85  |       fullPage: true,
  86  |     });
  87  | 
  88  |     await preferenceDialog.getByRole('button', { name: /Take a refreshment or waiting break before sightseeing/i }).click();
  89  |     await expect(preferenceDialog.getByRole('button', { name: 'Use this preference' })).toBeEnabled();
  90  |     await adminPage.screenshot({
  91  |       path: testInfo.outputPath('transport-early-arrival-preference-dialog.png'),
  92  |       fullPage: true,
  93  |     });
  94  |     await preferenceDialog.getByRole('button', { name: 'Use this preference' }).click();
  95  |     await expect(preferenceDialog).not.toBeVisible();
  96  |     await expect(
  97  |       adminPage.getByRole('button', { name: /Early-morning arrival preference.*Take a refreshment or waiting break.*Change/i }),
  98  |     ).toBeVisible();
  99  | 
  100 |     await adminPage.getByRole('radio', { name: 'Both Hotel and Vehicle', exact: true }).check();
  101 |     await expect(preferenceDialog).not.toBeVisible();
  102 | 
  103 |     await adminPage.getByRole('radio', { name: 'Vehicle', exact: true }).check();
  104 |     await expect(preferenceDialog).toBeVisible();
  105 |     await preferenceDialog.getByRole('button', { name: 'Close' }).click();
  106 |     await expect(preferenceDialog).not.toBeVisible();
  107 |   });
  108 | });
  109 | 
  110 | test.describe('Hotel + Transport early check-in confirmation', () => {
  111 |   test('explains previous-night room blocking and exposes explicit actions', async ({ adminPage }) => {
  112 |     await adminPage.goto('/create-itinerary', { waitUntil: 'domcontentloaded' });
  113 |     await expect(adminPage.getByText('Itinerary Preference *')).toBeVisible();
  114 | 
  115 |     await adminPage.getByRole('radio', { name: 'Both Hotel and Vehicle', exact: true }).check();
  116 |     await setStartTime(adminPage, 5, 'AM');
  117 |     await adminPage.getByText('Select Agent', { exact: true }).click();
> 118 |     await adminPage.getByRole('option').first().click();
      |                                                 ^ Error: locator.click: Target page, context or browser has been closed
  119 |     await adminPage.getByText('Choose Category', { exact: true }).click();
  120 |     await adminPage.getByRole('option').first().click();
  121 |     await chooseFirstLocation(adminPage, 'arrivalLocation');
  122 |     await chooseFirstLocation(adminPage, 'departureLocation');
  123 |     await chooseTripDates(adminPage);
  124 |     await adminPage.getByRole('button', { name: 'Save & Continue' }).click();
  125 | 
  126 |     const decisionDialog = adminPage.getByRole('dialog', {
  127 |       name: 'Early-Morning Hotel Check-in Confirmation',
  128 |     });
  129 |     await expect(decisionDialog).toBeVisible();
  130 |     await expect(decisionDialog).toContainText('blocked from the previous night');
  131 |     await expect(
  132 |       decisionDialog.getByRole('button', { name: 'No, keep same-day check-in' }),
  133 |     ).toBeVisible();
  134 |     await expect(
  135 |       decisionDialog.getByRole('button', { name: 'Yes, block room from previous night' }),
  136 |     ).toBeVisible();
  137 | 
  138 |     await decisionDialog.getByRole('button', { name: 'Yes, block room from previous night' }).click();
  139 |     await expect(decisionDialog).not.toBeVisible();
  140 |   });
  141 | });
  142 | 
```