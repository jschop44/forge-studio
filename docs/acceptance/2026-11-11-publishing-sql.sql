DO $forge_acceptance$
DECLARE r record; n integer; complete boolean := false;
BEGIN
 BEGIN
  IF (NOT EXISTS(SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('forge_users'::regclass,'forge_business_publications'::regclass,'forge_business_publication_snapshots'::regclass))) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: unexpected custom triggers require review'; END IF;
  INSERT INTO forge_users(id,email,password_hash) VALUES
   ('b2f39704-039a-46d1-ab50-4ee3f671929f'::uuid,'b2f39704-039a-46d1-ab50-4ee3f671929f@forge-acceptance.invalid','non-login fixture'),
   ('4c7c82ca-5b54-441d-aa0d-8cdbcc5c9cd8'::uuid,'4c7c82ca-5b54-441d-aa0d-8cdbcc5c9cd8@forge-acceptance.invalid','non-login fixture');
  EXECUTE 'WITH pages AS (SELECT p.slug,p.html FROM jsonb_to_recordset(''[{"slug":"index","html":"<!doctype html><html><head><title>Home</title></head><body><h1>Fixture version one</h1></body></html>"},{"slug":"contact","html":"<!doctype html><html><head><title>Contact</title></head><body><h1>Contact fixture one</h1></body></html>"}]''::jsonb) AS p(slug text,html text)),
   stored AS (INSERT INTO forge_business_publications(id,owner_id,slug,html)
    SELECT ''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid,''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid,slug,html FROM pages RETURNING id,owner_id,slug,html)
   INSERT INTO forge_business_publication_snapshots(publication_id,owner_id,version,slug,html)
   SELECT id,owner_id,1,slug,html FROM stored';
  IF ((SELECT count(*) FROM forge_business_publications WHERE id='d95a40a7-a823-4ae9-88c6-13e0c7e738c5'::uuid)=2) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: initial page set'; END IF;
  IF ((SELECT count(*) FROM forge_business_publication_snapshots WHERE publication_id='d95a40a7-a823-4ae9-88c6-13e0c7e738c5'::uuid AND version=1)=2) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: initial snapshot'; END IF;
  EXECUTE 'WITH proposed AS (
     SELECT p.slug,p.html FROM jsonb_to_recordset(''[{"slug":"index","html":"<!doctype html><html><head><title>Home</title></head><body><h1>Fixture version two</h1></body></html>"},{"slug":"contact","html":"<!doctype html><html><head><title>Contact</title></head><body><h1>Contact fixture two</h1></body></html>"}]''::jsonb) AS p(slug text,html text)
   ), existing AS (
     SELECT slug FROM forge_business_publications WHERE id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid
   ), compatible AS (
     SELECT EXISTS(SELECT 1 FROM existing)
      AND NOT EXISTS(SELECT slug FROM proposed EXCEPT SELECT slug FROM existing)
      AND NOT EXISTS(SELECT slug FROM existing EXCEPT SELECT slug FROM proposed) AS matches
   ), next_version AS (
     SELECT COALESCE(MAX(version),0)+1 AS version FROM forge_business_publication_snapshots
     WHERE publication_id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid
   ), snapshot AS (
     INSERT INTO forge_business_publication_snapshots(publication_id,owner_id,version,slug,html)
     SELECT ''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid,''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid,v.version,p.slug,p.html
     FROM proposed p CROSS JOIN next_version v CROSS JOIN compatible c WHERE c.matches AND v.version=1+1
     RETURNING slug,version
   ), updated AS (
     UPDATE forge_business_publications live SET html=p.html
     FROM proposed p WHERE live.id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND live.owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid
      AND live.slug=p.slug AND EXISTS(SELECT 1 FROM snapshot)
     RETURNING live.slug
   ) SELECT (SELECT MAX(version) FROM snapshot) AS version,COUNT(*)::int AS page_count FROM updated' INTO r;
  IF (r.version=2 AND r.page_count=2) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: revision version and page count'; END IF;
  IF ((SELECT count(*) FROM forge_business_publications WHERE id='d95a40a7-a823-4ae9-88c6-13e0c7e738c5'::uuid AND html LIKE '%two%')=2) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: revision live content'; END IF;
  IF ((SELECT count(*) FROM forge_business_publication_snapshots WHERE publication_id='d95a40a7-a823-4ae9-88c6-13e0c7e738c5'::uuid AND version=1 AND html LIKE '%one%')=2) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: immutable original snapshot'; END IF;
  EXECUTE 'WITH proposed AS (
     SELECT p.slug,p.html FROM jsonb_to_recordset(''[{"slug":"index","html":"<!doctype html><html><head><title>Home</title></head><body><h1>Fixture version two</h1></body></html>"},{"slug":"contact","html":"<!doctype html><html><head><title>Contact</title></head><body><h1>Contact fixture two</h1></body></html>"}]''::jsonb) AS p(slug text,html text)
   ), existing AS (
     SELECT slug FROM forge_business_publications WHERE id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid
   ), compatible AS (
     SELECT EXISTS(SELECT 1 FROM existing)
      AND NOT EXISTS(SELECT slug FROM proposed EXCEPT SELECT slug FROM existing)
      AND NOT EXISTS(SELECT slug FROM existing EXCEPT SELECT slug FROM proposed) AS matches
   ), next_version AS (
     SELECT COALESCE(MAX(version),0)+1 AS version FROM forge_business_publication_snapshots
     WHERE publication_id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid
   ), snapshot AS (
     INSERT INTO forge_business_publication_snapshots(publication_id,owner_id,version,slug,html)
     SELECT ''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid,''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid,v.version,p.slug,p.html
     FROM proposed p CROSS JOIN next_version v CROSS JOIN compatible c WHERE c.matches AND v.version=1+1
     RETURNING slug,version
   ), updated AS (
     UPDATE forge_business_publications live SET html=p.html
     FROM proposed p WHERE live.id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND live.owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid
      AND live.slug=p.slug AND EXISTS(SELECT 1 FROM snapshot)
     RETURNING live.slug
   ) SELECT (SELECT MAX(version) FROM snapshot) AS version,COUNT(*)::int AS page_count FROM updated' INTO r;
  IF (r.page_count=0) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: stale revision rejected'; END IF;
  IF ((SELECT max(version) FROM forge_business_publication_snapshots WHERE publication_id='d95a40a7-a823-4ae9-88c6-13e0c7e738c5'::uuid)=2) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: stale write created no snapshot'; END IF;
  EXECUTE 'WITH proposed AS (
     SELECT p.slug,p.html FROM jsonb_to_recordset(''[{"slug":"index","html":"<!doctype html><html><head><title>Home</title></head><body><h1>Fixture version two</h1></body></html>"},{"slug":"contact","html":"<!doctype html><html><head><title>Contact</title></head><body><h1>Contact fixture two</h1></body></html>"}]''::jsonb) AS p(slug text,html text)
   ), existing AS (
     SELECT slug FROM forge_business_publications WHERE id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''4c7c82ca-5b54-441d-aa0d-8cdbcc5c9cd8''::uuid
   ), compatible AS (
     SELECT EXISTS(SELECT 1 FROM existing)
      AND NOT EXISTS(SELECT slug FROM proposed EXCEPT SELECT slug FROM existing)
      AND NOT EXISTS(SELECT slug FROM existing EXCEPT SELECT slug FROM proposed) AS matches
   ), next_version AS (
     SELECT COALESCE(MAX(version),0)+1 AS version FROM forge_business_publication_snapshots
     WHERE publication_id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''4c7c82ca-5b54-441d-aa0d-8cdbcc5c9cd8''::uuid
   ), snapshot AS (
     INSERT INTO forge_business_publication_snapshots(publication_id,owner_id,version,slug,html)
     SELECT ''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid,''4c7c82ca-5b54-441d-aa0d-8cdbcc5c9cd8''::uuid,v.version,p.slug,p.html
     FROM proposed p CROSS JOIN next_version v CROSS JOIN compatible c WHERE c.matches AND v.version=2+1
     RETURNING slug,version
   ), updated AS (
     UPDATE forge_business_publications live SET html=p.html
     FROM proposed p WHERE live.id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND live.owner_id=''4c7c82ca-5b54-441d-aa0d-8cdbcc5c9cd8''::uuid
      AND live.slug=p.slug AND EXISTS(SELECT 1 FROM snapshot)
     RETURNING live.slug
   ) SELECT (SELECT MAX(version) FROM snapshot) AS version,COUNT(*)::int AS page_count FROM updated' INTO r;
  IF (r.page_count=0) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: other owner cannot revise'; END IF;
  EXECUTE 'SELECT count(*) FROM (SELECT s.version,COUNT(*)::int AS page_count,MIN(s.created_at) AS created_at
   FROM forge_business_publication_snapshots s
   WHERE s.publication_id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND s.owner_id=''4c7c82ca-5b54-441d-aa0d-8cdbcc5c9cd8''::uuid
   AND EXISTS(SELECT 1 FROM forge_business_publications p WHERE p.id=s.publication_id AND p.owner_id=s.owner_id)
   GROUP BY s.version ORDER BY s.version DESC LIMIT 100) AS protected_versions' INTO n;
  IF (n=0) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: other owner cannot read version metadata'; END IF;
  EXECUTE 'WITH gone AS (
    DELETE FROM forge_business_publications WHERE id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''4c7c82ca-5b54-441d-aa0d-8cdbcc5c9cd8''::uuid RETURNING id,slug
   ), discarded AS (
    DELETE FROM forge_business_publication_snapshots
    WHERE publication_id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''4c7c82ca-5b54-441d-aa0d-8cdbcc5c9cd8''::uuid
    AND EXISTS(SELECT 1 FROM gone) RETURNING version
   ) SELECT slug FROM gone'; GET DIAGNOSTICS n = ROW_COUNT;
  IF (n=0) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: other owner cannot unpublish'; END IF;
  EXECUTE 'WITH proposed AS (
     SELECT p.slug,p.html FROM jsonb_to_recordset(''[{"slug":"index","html":"<!doctype html><html><head><title>Home</title></head><body><h1>Fixture version two</h1></body></html>"},{"slug":"contact","html":"<!doctype html><html><head><title>Contact</title></head><body><h1>Contact fixture two</h1></body></html>"},{"slug":"about","html":"Unapproved page-set change"}]''::jsonb) AS p(slug text,html text)
   ), existing AS (
     SELECT slug FROM forge_business_publications WHERE id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid
   ), compatible AS (
     SELECT EXISTS(SELECT 1 FROM existing)
      AND NOT EXISTS(SELECT slug FROM proposed EXCEPT SELECT slug FROM existing)
      AND NOT EXISTS(SELECT slug FROM existing EXCEPT SELECT slug FROM proposed) AS matches
   ), next_version AS (
     SELECT COALESCE(MAX(version),0)+1 AS version FROM forge_business_publication_snapshots
     WHERE publication_id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid
   ), snapshot AS (
     INSERT INTO forge_business_publication_snapshots(publication_id,owner_id,version,slug,html)
     SELECT ''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid,''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid,v.version,p.slug,p.html
     FROM proposed p CROSS JOIN next_version v CROSS JOIN compatible c WHERE c.matches AND v.version=2+1
     RETURNING slug,version
   ), updated AS (
     UPDATE forge_business_publications live SET html=p.html
     FROM proposed p WHERE live.id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND live.owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid
      AND live.slug=p.slug AND EXISTS(SELECT 1 FROM snapshot)
     RETURNING live.slug
   ) SELECT (SELECT MAX(version) FROM snapshot) AS version,COUNT(*)::int AS page_count FROM updated' INTO r;
  IF (r.page_count=0) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: changed page set remains blocked'; END IF;
  EXECUTE 'WITH snapshot AS (
    SELECT slug,html FROM forge_business_publication_snapshots
    WHERE publication_id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid AND version=1
   ), current_pages AS (
    SELECT slug FROM forge_business_publications WHERE id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid
   ), compatible AS (
    SELECT EXISTS(SELECT 1 FROM snapshot)
     AND NOT EXISTS(SELECT slug FROM snapshot EXCEPT SELECT slug FROM current_pages)
     AND NOT EXISTS(SELECT slug FROM current_pages EXCEPT SELECT slug FROM snapshot) AS matches
   ), next_version AS (
    SELECT COALESCE(MAX(version),0)+1 AS version FROM forge_business_publication_snapshots
    WHERE publication_id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid
   ), recorded AS (
    INSERT INTO forge_business_publication_snapshots(publication_id,owner_id,version,slug,html)
    SELECT ''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid,''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid,n.version,s.slug,s.html
    FROM snapshot s CROSS JOIN next_version n CROSS JOIN compatible c
    WHERE c.matches AND n.version=2+1
    RETURNING slug,version
   ), updated AS (
    UPDATE forge_business_publications p SET html=s.html
    FROM snapshot s WHERE p.id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND p.owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid AND p.slug=s.slug
      AND EXISTS(SELECT 1 FROM recorded)
    RETURNING p.slug
   ) SELECT COUNT(*)::int AS page_count,(SELECT MAX(version) FROM recorded) AS new_version FROM updated' INTO r;
  IF (r.page_count=2 AND r.new_version=3) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: rollback creates a new revision'; END IF;
  IF ((SELECT count(*) FROM forge_business_publications WHERE id='d95a40a7-a823-4ae9-88c6-13e0c7e738c5'::uuid AND html LIKE '%one%')=2) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: rollback restored original content'; END IF;
  IF ((SELECT count(*) FROM forge_business_publication_snapshots WHERE publication_id='d95a40a7-a823-4ae9-88c6-13e0c7e738c5'::uuid)=6) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: rollback preserves all snapshots'; END IF;
  EXECUTE 'WITH snapshot AS (
    SELECT slug,html FROM forge_business_publication_snapshots
    WHERE publication_id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid AND version=1
   ), current_pages AS (
    SELECT slug FROM forge_business_publications WHERE id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid
   ), compatible AS (
    SELECT EXISTS(SELECT 1 FROM snapshot)
     AND NOT EXISTS(SELECT slug FROM snapshot EXCEPT SELECT slug FROM current_pages)
     AND NOT EXISTS(SELECT slug FROM current_pages EXCEPT SELECT slug FROM snapshot) AS matches
   ), next_version AS (
    SELECT COALESCE(MAX(version),0)+1 AS version FROM forge_business_publication_snapshots
    WHERE publication_id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid
   ), recorded AS (
    INSERT INTO forge_business_publication_snapshots(publication_id,owner_id,version,slug,html)
    SELECT ''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid,''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid,n.version,s.slug,s.html
    FROM snapshot s CROSS JOIN next_version n CROSS JOIN compatible c
    WHERE c.matches AND n.version=2+1
    RETURNING slug,version
   ), updated AS (
    UPDATE forge_business_publications p SET html=s.html
    FROM snapshot s WHERE p.id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND p.owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid AND p.slug=s.slug
      AND EXISTS(SELECT 1 FROM recorded)
    RETURNING p.slug
   ) SELECT COUNT(*)::int AS page_count,(SELECT MAX(version) FROM recorded) AS new_version FROM updated' INTO r;
  IF (r.page_count=0) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: stale rollback rejected'; END IF;
  EXECUTE 'WITH snapshot AS (
    SELECT slug,html FROM forge_business_publication_snapshots
    WHERE publication_id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid AND version=99
   ), current_pages AS (
    SELECT slug FROM forge_business_publications WHERE id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid
   ), compatible AS (
    SELECT EXISTS(SELECT 1 FROM snapshot)
     AND NOT EXISTS(SELECT slug FROM snapshot EXCEPT SELECT slug FROM current_pages)
     AND NOT EXISTS(SELECT slug FROM current_pages EXCEPT SELECT slug FROM snapshot) AS matches
   ), next_version AS (
    SELECT COALESCE(MAX(version),0)+1 AS version FROM forge_business_publication_snapshots
    WHERE publication_id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid
   ), recorded AS (
    INSERT INTO forge_business_publication_snapshots(publication_id,owner_id,version,slug,html)
    SELECT ''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid,''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid,n.version,s.slug,s.html
    FROM snapshot s CROSS JOIN next_version n CROSS JOIN compatible c
    WHERE c.matches AND n.version=3+1
    RETURNING slug,version
   ), updated AS (
    UPDATE forge_business_publications p SET html=s.html
    FROM snapshot s WHERE p.id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND p.owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid AND p.slug=s.slug
      AND EXISTS(SELECT 1 FROM recorded)
    RETURNING p.slug
   ) SELECT COUNT(*)::int AS page_count,(SELECT MAX(version) FROM recorded) AS new_version FROM updated' INTO r;
  IF (r.page_count=0) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: missing snapshot rejected'; END IF;
  EXECUTE 'WITH gone AS (
    DELETE FROM forge_business_publications WHERE id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid RETURNING id,slug
   ), discarded AS (
    DELETE FROM forge_business_publication_snapshots
    WHERE publication_id=''d95a40a7-a823-4ae9-88c6-13e0c7e738c5''::uuid AND owner_id=''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid
    AND EXISTS(SELECT 1 FROM gone) RETURNING version
   ) SELECT slug FROM gone'; GET DIAGNOSTICS n = ROW_COUNT;
  IF (n=2) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: owner unpublishes the complete page set'; END IF;
  IF (NOT EXISTS(SELECT 1 FROM forge_business_publication_snapshots WHERE publication_id='d95a40a7-a823-4ae9-88c6-13e0c7e738c5'::uuid)) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: unpublish removes retained history'; END IF;
  INSERT INTO forge_business_publication_snapshots(publication_id,owner_id,version,slug,html)
   VALUES('96df640a-4d88-454e-9e2b-5432e9034de0'::uuid,'b2f39704-039a-46d1-ab50-4ee3f671929f'::uuid,1,'index','conflict fixture');
  BEGIN
   EXECUTE 'WITH pages AS (SELECT p.slug,p.html FROM jsonb_to_recordset(''[{"slug":"index","html":"<!doctype html><html><head><title>Home</title></head><body><h1>Fixture version one</h1></body></html>"},{"slug":"contact","html":"<!doctype html><html><head><title>Contact</title></head><body><h1>Contact fixture one</h1></body></html>"}]''::jsonb) AS p(slug text,html text)),
   stored AS (INSERT INTO forge_business_publications(id,owner_id,slug,html)
    SELECT ''96df640a-4d88-454e-9e2b-5432e9034de0''::uuid,''b2f39704-039a-46d1-ab50-4ee3f671929f''::uuid,slug,html FROM pages RETURNING id,owner_id,slug,html)
   INSERT INTO forge_business_publication_snapshots(publication_id,owner_id,version,slug,html)
   SELECT id,owner_id,1,slug,html FROM stored';
   RAISE EXCEPTION 'Expected immutable snapshot conflict';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  IF (NOT EXISTS(SELECT 1 FROM forge_business_publications WHERE id='96df640a-4d88-454e-9e2b-5432e9034de0'::uuid)) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: failed snapshot insert rolls back every live page'; END IF;
  IF ((SELECT count(*) FROM forge_business_publication_snapshots WHERE publication_id='96df640a-4d88-454e-9e2b-5432e9034de0'::uuid)=1) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: failed creation leaves existing snapshot unchanged'; END IF;
  complete := true;
  RAISE SQLSTATE 'ZX001' USING MESSAGE='Intentional acceptance-fixture rollback';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN
  IF NOT complete THEN RAISE; END IF;
 END;
 IF (NOT EXISTS(SELECT 1 FROM forge_users WHERE id IN ('b2f39704-039a-46d1-ab50-4ee3f671929f'::uuid,'4c7c82ca-5b54-441d-aa0d-8cdbcc5c9cd8'::uuid))) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: fixture accounts rolled back'; END IF;
 IF (NOT EXISTS(SELECT 1 FROM forge_business_publications WHERE id IN ('d95a40a7-a823-4ae9-88c6-13e0c7e738c5'::uuid,'96df640a-4d88-454e-9e2b-5432e9034de0'::uuid))) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: fixture publications rolled back'; END IF;
 IF (NOT EXISTS(SELECT 1 FROM forge_business_publication_snapshots WHERE publication_id IN ('d95a40a7-a823-4ae9-88c6-13e0c7e738c5'::uuid,'96df640a-4d88-454e-9e2b-5432e9034de0'::uuid))) IS NOT TRUE THEN RAISE EXCEPTION 'Publishing SQL check failed: fixture snapshots rolled back'; END IF;
END
$forge_acceptance$;