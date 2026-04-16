"""
core/management/commands/seed_data.py

Populates the database with ~1 year of realistic charter aviation data.

Usage:
    python manage.py seed_data
    python manage.py seed_data --clear      # wipe & re-seed
    python manage.py seed_data --months 6   # shorter window
"""

import random
import uuid
from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from flights.models import (
    Aircraft,
    Airport,
    CharterRequest,
    CrewMember,
    EmailLog,
    Flight,
    FlightLeg,
    Invoice,
    MaintenanceLog,
    Notification,
)

User = get_user_model()

# ─── helpers ────────────────────────────────────────────────────────────────

def rnd(a, b):
    """Random float rounded to 2dp."""
    return round(random.uniform(a, b), 2)


def rnd_decimal(a, b):
    return Decimal(str(rnd(a, b)))


def random_date_in_range(start: date, end: date) -> date:
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))


def random_datetime_in_range(start: date, end: date):
    d = random_date_in_range(start, end)
    h = random.randint(5, 21)
    m = random.choice([0, 15, 30, 45])
    return timezone.make_aware(
        timezone.datetime(d.year, d.month, d.day, h, m)
    )


# ─── fixture data ───────────────────────────────────────────────────────────

AIRPORTS_DATA = [
    ("NBO", "Jomo Kenyatta International", "Nairobi",      "Kenya",        -1.3192,  36.9275),
    ("WIL", "Wilson Airport",              "Nairobi",      "Kenya",        -1.3212,  36.8148),
    ("MBA", "Moi International",           "Mombasa",      "Kenya",        -4.0348,  39.5942),
    ("EDL", "Eldoret International",       "Eldoret",      "Kenya",         0.4045,  35.2389),
    ("KIS", "Kisumu International",        "Kisumu",       "Kenya",        -0.0861,  34.7290),
    ("LAU", "Manda Island Airport",        "Lamu",         "Kenya",        -2.2524,  40.9131),
    ("MYD", "Malindi Airport",             "Malindi",      "Kenya",        -3.2293,  40.1017),
    ("DAR", "Julius Nyerere International","Dar es Salaam","Tanzania",     -6.8781,  39.2026),
    ("ZNZ", "Abeid Amani Karume Intl",     "Zanzibar",     "Tanzania",     -6.2220,  39.2249),
    ("EBB", "Entebbe International",       "Kampala",      "Uganda",        0.0424,  32.4435),
    ("ADD", "Bole International",          "Addis Ababa",  "Ethiopia",      8.9779,  38.7993),
    ("DXB", "Dubai International",         "Dubai",        "UAE",          25.2532,  55.3657),
    ("JNB", "OR Tambo International",      "Johannesburg", "South Africa", -26.1392, 28.2460),
    ("CPT", "Cape Town International",     "Cape Town",    "South Africa", -33.9648, 18.6017),
    ("LOS", "Murtala Muhammed Intl",       "Lagos",        "Nigeria",       6.5774,   3.3214),
]

AIRCRAFT_DATA = [
    # (tail, name, make, model, category, year, pax, range_km, speed_kmh, hourly_usd)
    ("5Y-GAL", "Galana",    "Cessna",    "Citation CJ3", "light",         2019, 7,  3705, 778,  3_200),
    ("5Y-SAF", "Safari",    "Pilatus",   "PC-12 NG",     "turboprop",     2020, 9,  3480, 528,  2_800),
    ("5Y-KEN", "Kenya One", "Embraer",   "Legacy 450",   "midsize",       2018, 8,  4260, 870,  5_500),
    ("5Y-RFT", "Rift",      "Beechcraft","King Air 360", "turboprop",     2021, 9,  3003, 580,  2_400),
    ("5Y-SER", "Serengeti", "Dassault",  "Falcon 2000S", "super_midsize", 2017, 10, 6300, 900,  8_000),
    ("5Y-ATL", "Atlantic",  "Gulfstream","G550",         "heavy",         2016, 16, 12500,1061, 14_000),
    ("5Y-SAV", "Savannah",  "Bombardier","Challenger 650","heavy",        2020, 12, 7408, 870,  11_500),
    ("5Y-VIP", "VIP One",   "Boeing",    "BBJ 737",      "vip_airliner",  2015, 30, 10500,870,  25_000),
]

CREW_DATA = [
    # (first, last, crew_role, license, total_hours, type_ratings)
    ("James",   "Mwangi",    "captain",       "KE-CPL-001", 8500,  ["PC-12","CJ3","King Air"]),
    ("Sarah",   "Otieno",    "captain",       "KE-CPL-002", 6200,  ["Legacy 450","Falcon 2000"]),
    ("Peter",   "Kamau",     "captain",       "KE-CPL-003", 12000, ["G550","BBJ 737","Challenger 650"]),
    ("Grace",   "Njeri",     "first_officer", "KE-CPL-004", 2800,  ["PC-12","CJ3"]),
    ("David",   "Ochieng",   "first_officer", "KE-CPL-005", 3100,  ["Legacy 450","Falcon 2000"]),
    ("Amina",   "Hassan",    "first_officer", "KE-CPL-006", 4500,  ["G550","Challenger 650"]),
    ("Faith",   "Wanjiru",   "cabin_crew",    "KE-CC-001",  1200,  []),
    ("Michael", "Kariuki",   "cabin_crew",    "KE-CC-002",  980,   []),
]

CLIENT_DATA = [
    ("alice",   "alice@example.com",   "Alice",  "Wanjiku",  "Safaricom PLC"),
    ("bob",     "bob@example.com",     "Bob",    "Ndegwa",   "KCB Group"),
    ("carol",   "carol@example.com",   "Carol",  "Achieng",  "Equity Bank"),
    ("david",   "david@example.com",   "David",  "Mbithi",   "East African Breweries"),
    ("eve",     "eve@example.com",     "Eve",    "Chebet",   "Kenya Airways"),
    ("frank",   "frank@example.com",   "Frank",  "Mugo",     "Nation Media Group"),
    ("grace2",  "grace2@example.com",  "Grace",  "Anyango",  "Stanbic Bank"),
    ("henry",   "henry@example.com",   "Henry",  "Rotich",   "Brookside Dairy"),
]

FIRST_NAMES = ["Liam","Noah","Oliver","Elijah","James","Aiden","Lucas","Mason",
               "Ethan","Logan","Amara","Fatima","Zara","Imani","Nadia","Leila",
               "Amina","Khadija","Ibrahim","Omar","Yusuf","Ali","Hamid","Said"]
LAST_NAMES  = ["Omondi","Kamau","Njoroge","Mwangi","Otieno","Wanjiku","Kipchoge",
               "Mutua","Ndung'u","Karanja","Hassan","Ahmed","Mohamed","Ali","Omar"]


# ─── main command ───────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Seed the database with ~1 year of realistic charter aviation data"

    def add_arguments(self, parser):
        parser.add_argument("--clear",  action="store_true", help="Delete existing data first")
        parser.add_argument("--months", type=int, default=13, help="How many months to seed (default 13)")

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write(self.style.WARNING("⚠  Clearing existing data …"))
            self._clear()

        months = options["months"]
        today  = date.today()
        seed_start = today - timedelta(days=30 * months)

        self.stdout.write("🌱 Seeding airports …")
        airports = self._seed_airports()

        self.stdout.write("🌱 Seeding aircraft …")
        aircraft_list = self._seed_aircraft(airports)

        self.stdout.write("🌱 Seeding users & crew …")
        admin, ops_staff, clients, crew_members = self._seed_users(airports)

        self.stdout.write("🌱 Seeding flights & charter requests …")
        flights = self._seed_flights(seed_start, today, airports, aircraft_list,
                                     crew_members, clients)

        self.stdout.write("🌱 Seeding maintenance logs …")
        self._seed_maintenance(seed_start, today, aircraft_list)

        self.stdout.write("🌱 Seeding invoices …")
        self._seed_invoices(flights, admin)

        self.stdout.write("🌱 Seeding email logs …")
        self._seed_email_logs(flights, ops_staff)

        self.stdout.write("🌱 Seeding notifications …")
        self._seed_notifications(clients + [admin] + ops_staff, flights, aircraft_list)

        self.stdout.write(self.style.SUCCESS(
            f"\n✅  Seed complete — {len(flights)} flights over ~{months} months."
        ))

    # ── clear ───────────────────────────────────────────────────────────────

    def _clear(self):
        for model in [Notification, EmailLog, Invoice, FlightLeg,
                      Flight, CharterRequest, MaintenanceLog,
                      CrewMember, Aircraft, Airport]:
            model.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

    # ── airports ─────────────────────────────────────────────────────────────

    def _seed_airports(self):
        airports = {}
        for code, name, city, country, lat, lon in AIRPORTS_DATA:
            obj, _ = Airport.objects.get_or_create(
                code=code,
                defaults=dict(name=name, city=city, country=country,
                              latitude=Decimal(str(lat)),
                              longitude=Decimal(str(lon))))
            airports[code] = obj
        return airports

    # ── aircraft ─────────────────────────────────────────────────────────────

    def _seed_aircraft(self, airports):
        airport_list = list(airports.values())
        aircraft_list = []
        nbo = airports.get("NBO") or airport_list[0]

        for tail, name, make, model, category, year, pax, range_km, speed, hourly in AIRCRAFT_DATA:
            total_hours = Decimal(str(random.randint(800, 5000)))
            last_maint  = total_hours - Decimal(str(random.randint(10, 180)))
            obj, _ = Aircraft.objects.get_or_create(
                tail_number=tail,
                defaults=dict(
                    name=name, make=make, model=model,
                    category=category,
                    year_manufactured=year,
                    passenger_capacity=pax,
                    range_km=range_km,
                    cruise_speed_kmh=speed,
                    hourly_rate_usd=Decimal(str(hourly)),
                    base_airport=nbo,
                    status=random.choices(
                        ["available","available","available","maintenance","grounded"],
                        weights=[70,10,10,7,3])[0],
                    total_flight_hours=total_hours,
                    last_maintenance_hours=last_maint,
                    last_maintenance_date=date.today() - timedelta(days=random.randint(30,180)),
                    next_maintenance_date=date.today() + timedelta(days=random.randint(14,120)),
                    insurance_expiry=date.today() + timedelta(days=random.randint(60,365)),
                    airworthiness_expiry=date.today() + timedelta(days=random.randint(30,365)),
                    registration_expiry=date.today() + timedelta(days=random.randint(90,730)),
                    amenities=random.sample(
                        ["WiFi","Satellite Phone","Bar","Catering","Lie-flat Seats",
                         "Entertainment System","Shower","Conference Table"], k=random.randint(2,6)),
                ))
            aircraft_list.append(obj)
        return aircraft_list

    # ── users & crew ─────────────────────────────────────────────────────────

    def _seed_users(self, airports):
        # superuser / admin
        admin, _ = User.objects.get_or_create(
            username="admin",
            defaults=dict(email="admin@nairobijets.co.ke",
                          first_name="Operations", last_name="Admin",
                          role="admin", is_staff=True, is_superuser=True))
        if _:
            admin.set_password("admin1234")
            admin.save()

        # ops staff
        ops_staff = []
        for i, (uname, email, fn, ln) in enumerate([
            ("ops1","ops1@nairobijets.co.ke","Janet","Muthoni"),
            ("ops2","ops2@nairobijets.co.ke","Brian","Korir"),
        ]):
            u, _ = User.objects.get_or_create(
                username=uname,
                defaults=dict(email=email, first_name=fn, last_name=ln,
                              role="ops", is_staff=True))
            if _:
                u.set_password("ops1234")
                u.save()
            ops_staff.append(u)

        # clients
        clients = []
        for uname, email, fn, ln, company in CLIENT_DATA:
            u, _ = User.objects.get_or_create(
                username=uname,
                defaults=dict(email=email, first_name=fn, last_name=ln,
                              role="client", company=company))
            if _:
                u.set_password("client1234")
                u.save()
            clients.append(u)

        # pilots / crew
        crew_members = []
        airport_list = list(airports.values())
        for i, (fn, ln, crole, lic, hours, ratings) in enumerate(CREW_DATA):
            uname = f"crew_{fn.lower()}"
            u, _ = User.objects.get_or_create(
                username=uname,
                defaults=dict(email=f"{uname}@nairobijets.co.ke",
                              first_name=fn, last_name=ln,
                              role="pilot", license_number=lic))
            if _:
                u.set_password("crew1234")
                u.save()

            cm, _ = CrewMember.objects.get_or_create(
                user=u,
                defaults=dict(
                    crew_role=crole,
                    license_number=lic,
                    license_expiry=date.today() + timedelta(days=random.randint(180,730)),
                    medical_expiry=date.today() + timedelta(days=random.randint(60,365)),
                    type_ratings=ratings,
                    total_hours=Decimal(str(hours)),
                    status="available",
                    base_airport=random.choice(airport_list),
                ))
            crew_members.append(cm)

        return admin, ops_staff, clients, crew_members

    # ── flights ──────────────────────────────────────────────────────────────

    def _seed_flights(self, start, today, airports, aircraft_list, crew_members, clients):
        airport_codes = list(airports.keys())
        captains    = [c for c in crew_members if c.crew_role == "captain"]
        fos         = [c for c in crew_members if c.crew_role == "first_officer"]

        flights = []
        flight_counter = 1
        req_counter    = 1

        current = start
        while current <= today + timedelta(days=60):   # seed 60 days ahead too
            # 2-6 flights per week, lumped into batches
            day_offset = random.randint(0, 3)
            current += timedelta(days=day_offset if day_offset > 0 else 1)
            if current > today + timedelta(days=60):
                break

            n_flights_today = random.randint(1, 3)
            for _ in range(n_flights_today):
                origin_code = random.choice(airport_codes)
                dest_code   = random.choice([c for c in airport_codes if c != origin_code])
                origin      = airports[origin_code]
                destination = airports[dest_code]

                ac = random.choice(aircraft_list)
                captain    = random.choice(captains) if captains else None
                fo         = random.choice(fos) if fos else None
                client_user = random.choice(clients)

                dep_hour = random.randint(5, 20)
                dep_min  = random.choice([0, 15, 30, 45])
                dep_dt   = timezone.make_aware(
                    timezone.datetime(current.year, current.month, current.day,
                                      dep_hour, dep_min))
                est_hours = Decimal(str(rnd(0.8, 9.0)))
                arr_dt    = dep_dt + timedelta(hours=float(est_hours))

                # determine status
                if current < today - timedelta(days=1):
                    status = random.choices(
                        ["completed","completed","completed","cancelled","diverted"],
                        weights=[80, 7, 5, 6, 2])[0]
                    actual_dep = dep_dt + timedelta(minutes=random.randint(-10, 45))
                    actual_arr = actual_dep + timedelta(hours=float(est_hours) + rnd(-0.1, 0.3))
                    actual_hours = est_hours + Decimal(str(rnd(-0.1, 0.4)))
                else:
                    status = random.choices(
                        ["scheduled","boarding","delayed"],
                        weights=[80, 10, 10])[0]
                    actual_dep = actual_arr = actual_hours = None

                pax  = random.randint(1, ac.passenger_capacity)
                price = Decimal(str(float(ac.hourly_rate_usd) * float(est_hours) * rnd(0.9, 1.15)))
                price = price.quantize(Decimal("0.01"))

                flight_type = random.choices(
                    ["charter","private","cargo","positioning"],
                    weights=[65, 20, 8, 7])[0]

                # create charter request for most flights
                charter_req = None
                if flight_type in ("charter", "private") and random.random() < 0.85:
                    charter_status = "confirmed" if status == "completed" else (
                        "cancelled" if status == "cancelled" else
                        random.choice(["confirmed","quoted"]))
                    charter_req = CharterRequest.objects.create(
                        client_name=f"{client_user.first_name} {client_user.last_name}",
                        client_email=client_user.email,
                        client_phone=f"+2547{random.randint(10000000,99999999)}",
                        company=client_user.company,
                        trip_type=random.choice(["one_way","one_way","round_trip","multi_leg"]),
                        origin=origin,
                        destination=destination,
                        departure_date=current,
                        departure_time=time(dep_hour, dep_min),
                        passenger_count=pax,
                        preferred_category=ac.category,
                        catering_requested=random.random() < 0.4,
                        ground_transport=random.random() < 0.25,
                        status=charter_status,
                    )
                    req_counter += 1

                manifest = [
                    {
                        "name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
                        "passport": f"A{random.randint(1000000,9999999)}",
                        "nationality": random.choice(["Kenyan","Tanzanian","Ugandan","British","American"]),
                    }
                    for _ in range(pax)
                ]

                fn_str = f"PC-{flight_counter:04d}"
                try:
                    flight = Flight.objects.create(
                        flight_number=fn_str,
                        flight_type=flight_type,
                        charter_request=charter_req,
                        client=client_user,
                        origin=origin,
                        destination=destination,
                        departure_dt=dep_dt,
                        arrival_dt=arr_dt,
                        actual_departure_dt=actual_dep,
                        actual_arrival_dt=actual_arr,
                        aircraft=ac,
                        captain=captain,
                        first_officer=fo,
                        passenger_count=pax,
                        manifest=manifest,
                        estimated_hours=est_hours,
                        actual_hours=actual_hours,
                        fuel_uplift_kg=Decimal(str(rnd(200, 8000))) if actual_dep else None,
                        status=status,
                        quoted_price_usd=price,
                        commission_pct=Decimal(str(rnd(8, 15))),
                        is_invoiced=status == "completed" and random.random() < 0.85,
                        notes=random.choice([
                            "", "", "",
                            "Client requested extra catering.",
                            "VIP passenger — handle with discretion.",
                            "Medical equipment on board.",
                            "Connecting flight — ensure timely turnaround.",
                            "Pet on board — notify ground crew.",
                        ]),
                    )
                    flights.append(flight)
                    flight_counter += 1

                    # add legs for multi-leg
                    if charter_req and charter_req.trip_type == "multi_leg" and random.random() < 0.6:
                        mid_code = random.choice([c for c in airport_codes
                                                   if c not in (origin_code, dest_code)])
                        mid_airport = airports[mid_code]
                        mid_dt = dep_dt + timedelta(hours=float(est_hours) / 2)
                        FlightLeg.objects.create(
                            flight=flight, leg_number=1,
                            origin=origin, destination=mid_airport,
                            departure_dt=dep_dt, arrival_dt=mid_dt, status="completed" if status=="completed" else "scheduled")
                        FlightLeg.objects.create(
                            flight=flight, leg_number=2,
                            origin=mid_airport, destination=destination,
                            departure_dt=mid_dt + timedelta(minutes=45),
                            arrival_dt=arr_dt, status="completed" if status=="completed" else "scheduled")

                except Exception as e:
                    self.stderr.write(f"  Skipped flight {fn_str}: {e}")

        return flights

    # ── maintenance ──────────────────────────────────────────────────────────

    def _seed_maintenance(self, start, today, aircraft_list):
        types = ["routine","routine","inspection","repair","upgrade","annual","emergency"]
        statuses = ["completed","completed","completed","in_progress","scheduled","cancelled"]

        for ac in aircraft_list:
            # 4-10 maintenance events per aircraft over the year
            n = random.randint(4, 10)
            for _ in range(n):
                sched = random_date_in_range(start, today + timedelta(days=90))
                mtype = random.choice(types)
                is_past = sched <= today
                mstatus = random.choice(["completed","completed","in_progress"]) if is_past else "scheduled"

                MaintenanceLog.objects.create(
                    aircraft=ac,
                    maintenance_type=mtype,
                    status=mstatus,
                    scheduled_date=sched,
                    completed_date=sched + timedelta(days=random.randint(0, 3)) if mstatus == "completed" else None,
                    flight_hours_at=ac.total_flight_hours - Decimal(str(random.randint(0, 500))),
                    description=random.choice([
                        "100-hour inspection completed per manufacturer schedule.",
                        "Annual airworthiness check — all items cleared.",
                        "Engine oil change and filter replacement.",
                        "Landing gear inspection and lubrication.",
                        "Avionics software update installed.",
                        "Brake pad replacement — both main gear.",
                        "Interior deep clean and upholstery repair.",
                        "AOG hydraulic leak repair — aircraft returned to service.",
                        "Tyres replaced — all four main gear.",
                        "Pitot-static system calibration.",
                    ]),
                    technician=random.choice([
                        "Nairobi MRO Ltd","Kenya Airways Technical","Wilson Avtech",
                        "East African Aviation Services","Precision Air Engineering",
                    ]),
                    facility=random.choice(["NBO Hangar 3","WIL South Apron","MBA MRO Bay 1"]),
                    cost_usd=Decimal(str(random.randint(500, 85000))),
                )

    # ── invoices ─────────────────────────────────────────────────────────────

    def _seed_invoices(self, flights, created_by):
        inv_num = 1000
        for flight in flights:
            if not flight.is_invoiced:
                continue
            if hasattr(flight, "invoice"):
                continue

            tax_pct = Decimal(str(random.choice([0, 0, 16])))  # Kenya VAT or nil-rated
            amount  = flight.quoted_price_usd or Decimal("5000")
            tax_usd = (amount * tax_pct / 100).quantize(Decimal("0.01"))
            total   = amount + tax_usd

            paid_date = None
            inv_status = random.choices(
                ["paid","paid","sent","overdue","draft"],
                weights=[55, 15, 15, 10, 5])[0]
            if inv_status == "paid":
                paid_date = flight.departure_dt.date() + timedelta(days=random.randint(1, 30))

            Invoice.objects.create(
                invoice_number=f"{inv_num:05d}",
                flight=flight,
                client_name=f"{flight.client.first_name} {flight.client.last_name}" if flight.client else "Charter Client",
                client_email=flight.client.email if flight.client else "client@example.com",
                amount_usd=amount,
                tax_pct=tax_pct,
                tax_usd=tax_usd,
                total_usd=total,
                due_date=flight.departure_dt.date() + timedelta(days=14),
                paid_date=paid_date,
                status=inv_status,
                created_by=created_by,
            )
            inv_num += 1

    # ── email logs ───────────────────────────────────────────────────────────

    def _seed_email_logs(self, flights, ops_staff):
        templates = [
            ("Charter Confirmation – Flight {fn}", "booking_confirmation"),
            ("Quote for Your Charter Request",      "quote"),
            ("Flight Reminder – Departing Tomorrow","reminder"),
            ("Invoice for Flight {fn}",             "invoice"),
            ("Post-Flight Survey",                  "survey"),
            ("Charter Request Received",            "request_ack"),
        ]

        sender = ops_staff[0] if ops_staff else None
        for flight in random.sample(flights, min(len(flights), int(len(flights) * 0.9))):
            subj_tmpl, etype = random.choice(templates)
            subject = subj_tmpl.format(fn=flight.flight_number)
            EmailLog.objects.create(
                sent_by=sender,
                to_email=flight.client.email if flight.client else "client@example.com",
                to_name=f"{flight.client.first_name} {flight.client.last_name}" if flight.client else "Client",
                subject=subject,
                body=f"Dear Valued Client,\n\nPlease find details regarding {flight.flight_number} "
                     f"({flight.origin.code} → {flight.destination.code}) on "
                     f"{flight.departure_dt.date()}.\n\nKind regards,\nNairobi Jet House Operations",
                email_type=etype,
                related_id=flight.pk,
                success=random.random() > 0.02,
            )

    # ── notifications ────────────────────────────────────────────────────────

    def _seed_notifications(self, users, flights, aircraft_list):
        notif_templates = [
            ("info",    "Flight Scheduled",       "Your flight {fn} has been scheduled for {date}."),
            ("success", "Payment Received",        "Payment for flight {fn} has been confirmed."),
            ("warning", "Maintenance Due",         "Aircraft {tail} is approaching maintenance interval."),
            ("alert",   "Flight Delayed",          "Flight {fn} has been delayed by 45 minutes."),
            ("info",    "New Charter Request",     "A new charter request has been received."),
            ("warning", "Document Expiring Soon",  "Insurance for {tail} expires in 30 days."),
            ("success", "Flight Completed",        "Flight {fn} has landed safely."),
            ("alert",   "Crew Availability",       "Captain unavailable — reassignment needed."),
        ]

        for user in users:
            n = random.randint(3, 15)
            for _ in range(n):
                ntype, title, msg_tmpl = random.choice(notif_templates)
                flight = random.choice(flights)
                ac = random.choice(aircraft_list)
                message = msg_tmpl.format(
                    fn=flight.flight_number,
                    date=flight.departure_dt.date(),
                    tail=ac.tail_number)
                notif = Notification.objects.create(
                    user=user,
                    title=title,
                    message=message,
                    notif_type=ntype,
                    is_read=random.random() < 0.6,
                    link=f"/flights/{flight.pk}/",
                )
                # backdate created_at
                days_ago = random.randint(0, 365)
                Notification.objects.filter(pk=notif.pk).update(
                    created_at=timezone.now() - timedelta(days=days_ago))