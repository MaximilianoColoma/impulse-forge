
ALTER TABLE public.projects            ALTER COLUMN space_id SET DEFAULT public.default_space_id_for_current_actor();
ALTER TABLE public.impulses            ALTER COLUMN space_id SET DEFAULT public.default_space_id_for_current_actor();
ALTER TABLE public.contacts            ALTER COLUMN space_id SET DEFAULT public.default_space_id_for_current_actor();
ALTER TABLE public.blueprint_feedback  ALTER COLUMN space_id SET DEFAULT public.default_space_id_for_current_actor();
ALTER TABLE public.structure_snapshots ALTER COLUMN space_id SET DEFAULT public.default_space_id_for_current_actor();
ALTER TABLE public.structure_templates ALTER COLUMN space_id SET DEFAULT public.default_space_id_for_current_actor();
ALTER TABLE public.user_tools          ALTER COLUMN space_id SET DEFAULT public.default_space_id_for_current_actor();
