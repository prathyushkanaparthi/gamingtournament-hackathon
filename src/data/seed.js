export const gameImages = {
  Valorant: 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/cbf4460132cdfeb2a97fad5f9dd25ba0bc058f76-128x128.png?accountingTag=VAL',
  BGMI: 'https://wstatic-prod.battlegroundsmobileindia.com/web/live/static/og/og.jpg',
  'Rocket League': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/252950/00a40431fd658869bd65c58ee51d3370cbb5830f/capsule_616x353_alt_assets_17.jpg?t=1791210513',
  'Apex Legends': 'https://drop-assets.ea.com/images/3y7UvygiXzw9jlo05Mn3I5/3d6885fa12103d27c410646df999b979/Apex_S31-Season-Page-16x9.jpg?im=AspectCrop=(1,1),xPosition=0.76875,yPosition=0.4444444444444444&w=500&q=100',
  'EA FC 26': 'https://drop-assets.ea.com/images/3eEHjjY2wGQ5tSWAaF37cL/b03bdcaa03bdba60d2b1b52d91bedbbe/fc26-twg-featured-image-16x9.jpg?im=AspectCrop=(1,1),xPosition=0.5,yPosition=0.5&w=500&q=100',
}

export const initialTournaments = [
  { id: 'valorant-open', name: 'Neon Rift: Valorant Open', game: 'Valorant', imageUrl: gameImages.Valorant, status: 'Open', date: '2026-12-08', time: '18:30', prize: 2500, fee: 10, format: '5v5 • Single elimination', slots: 16, filled: 11, rosterSize: 5, accent: 'violet', description: 'Bring your squad and take over the Rift. A community-first bracket for rising teams.', rules: [{ id: 'check-in', title: 'Check-in', body: 'Players must check in 30 minutes before match time.' }, { id: 'match-format', title: 'Match format', body: 'All matches are best-of-one until the final.' }, { id: 'conduct', title: 'Player conduct', body: 'Respectful play is required; admins resolve disputes.' }] },
  { id: 'bgmi-showdown', name: 'Drop Zone Showdown', game: 'BGMI', imageUrl: gameImages.BGMI, status: 'Open', date: '2026-12-12', time: '20:00', prize: 1800, fee: 5, format: 'Squad • 3 matches', slots: 25, filled: 19, rosterSize: 4, accent: 'orange', description: 'A high-stakes squad showdown. Loot fast, rotate smart, and claim the chicken dinner.', rules: [{ id: 'roster', title: 'Squad roster', body: 'Squads may register up to one substitute.' }, { id: 'fair-play', title: 'Fair play', body: 'No emulators or unauthorized tools.' }, { id: 'scoring', title: 'Scoring', body: 'Points are awarded by placement and eliminations.' }] },
  { id: 'rocket-league', name: 'Boosted Circuit', game: 'Rocket League', imageUrl: gameImages['Rocket League'], status: 'Open', date: '2026-12-15', time: '19:00', prize: 900, fee: 0, format: '3v3 • Double elimination', slots: 12, filled: 7, rosterSize: 3, accent: 'cyan', description: 'Fast rotations and clean aerials only. The circuit is open to every rank.', rules: [{ id: 'roster', title: 'Active roster', body: 'Three players per active roster.' }, { id: 'match-format', title: 'Match format', body: 'Matches are best-of-three.' }, { id: 'grace-period', title: 'Grace period', body: 'A five-minute grace period applies.' }] },
  { id: 'apex-cup', name: 'Apex Afterdark Cup', game: 'Apex Legends', imageUrl: gameImages['Apex Legends'], status: 'Starting soon', date: '2026-11-29', time: '21:00', prize: 3200, fee: 20, format: 'Trios • 4 rounds', slots: 20, filled: 20, rosterSize: 3, accent: 'red', description: 'The lobby is locked. Tune in for the final showdown this weekend.', rules: [{ id: 'registered-roster', title: 'Registered roster', body: 'Only players on the registered roster may compete.' }, { id: 'rounds', title: 'Rounds and scoring', body: 'Four rounds; best three count.' }, { id: 'admin-review', title: 'Admin review', body: 'Tournament admins have final ruling.' }] },
  { id: 'fifa-nights', name: 'FC Friday Nights', game: 'EA FC 26', imageUrl: gameImages['EA FC 26'], status: 'Completed', date: '2026-11-10', time: '19:00', prize: 500, fee: 0, format: '1v1 • Knockout', slots: 32, filled: 32, rosterSize: 1, accent: 'green', description: 'A quick-fire community bracket. Results are published in the leaderboard.', rules: [{ id: 'entry', title: 'Entry format', body: 'One player per entry.' }, { id: 'match-length', title: 'Match length', body: 'Six-minute halves.' }, { id: 'tiebreaker', title: 'Tiebreaker', body: 'Extra time and penalties if tied.' }] },
]

export const initialUsers = [
  { id: 'u-player', name: 'Alex Morgan', email: 'player@arena.demo', password: 'player123', role: 'Player', gamerTag: 'volt.exe', avatar: 'AM' },
  { id: 'u-admin', name: 'Arena Admin', email: 'admin@arena.demo', password: 'admin123', role: 'Admin', gamerTag: 'arena_admin', avatar: 'AA' },
  { id: 'u-sam', name: 'Sam Rivera', email: 'sam@arena.demo', password: 'player123', role: 'Player', gamerTag: 'samsational', avatar: 'SR' },
]

export const initialTeams = [
  { id: 'team-neon', tournamentId: 'valorant-open', name: 'Neon Ninjas', captainId: 'u-player', memberIds: ['u-player', 'u-sam'], inviteCode: 'NEON24', registration: 'Registered' },
]

export const initialRegistrations = [
  { id: 'reg-apex', tournamentId: 'apex-cup', playerId: 'u-player', status: 'Confirmed', teamId: null, createdAt: '2026-11-20' },
  { id: 'reg-fc', tournamentId: 'fifa-nights', playerId: 'u-player', status: 'Completed', teamId: null, createdAt: '2026-11-08' },
]

export const initialResults = [{ tournamentId: 'fifa-nights', place: 1, player: 'KaiZen', prize: 300 }, { tournamentId: 'fifa-nights', place: 2, player: 'volt.exe', prize: 150 }, { tournamentId: 'fifa-nights', place: 3, player: 'Mira', prize: 50 }]
