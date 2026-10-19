-- Accept reviewed properties beyond the Las Vegas valley.
alter table public.venues drop constraint venues_latitude_check;
alter table public.venues drop constraint venues_longitude_check;
alter table public.venues add constraint venues_latitude_check check (latitude between -90 and 90);
alter table public.venues add constraint venues_longitude_check check (longitude between -180 and 180);
