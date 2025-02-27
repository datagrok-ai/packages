--name: searchPatentBySubstructure
--connection: SureChembl
--input: string pattern {semType: Substructure}
--input: int maxMols = 10
with molecules as (select m, schembl_chem_id from rdk.mols mols where m@>@pattern::qmol limit @maxMols)
 select m as smiles, text as title, sd.id as doc_surechembl_id, lang as language, assign_applic, scpn as doc_id, published,
 string_agg(CASE WHEN sdc.field=1 THEN 'DESCRIPTION'
             WHEN sdc.field=2 THEN 'CLAIMS'
             WHEN sdc.field=3 THEN 'ABSTRACT'
             WHEN sdc.field=4 THEN 'TITLE'
             WHEN sdc.field=5 THEN 'IMAGES'
             WHEN sdc.field=6 THEN 'ATTACHMENTS'
             ELSE 'other'
             END, ',') as fields -- section of the patent where structure was found, the frequency is the number of times the compound was found in a given section of a given patent
 from molecules mols
 join schembl_document_chemistry sdc on sdc.schembl_chem_id = mols.schembl_chem_id and sdc.frequency > 0
 join schembl_document sd on sdc.schembl_doc_id = sd.id
 join schembl_document_title sdt on sdt.schembl_doc_id = sd.id
 group by m, text, sd.id, lang, assign_applic, scpn, published
--end


--name: searchPatentBySimilarity
--connection: SureChembl
--meta.batchMode: true
--input: string pattern {semType: Molecule}
--input: double threshold = 0.6 { min: 0, max: 1 }
--input: int maxMols = 10
select set_config('rdkit.tanimoto_threshold', @threshold::text, true);
--batch
with molecules as (select m, schembl_chem_id, similarity from get_mfp2_neighbors(@pattern) order by similarity desc limit @maxMols)
select m as smiles, similarity, text as title, sd.id as doc_surechembl_id, lang as language, assign_applic, scpn as doc_id, published,
 string_agg(CASE WHEN sdc.field=1 THEN 'DESCRIPTION'
             WHEN sdc.field=2 THEN 'CLAIMS'
             WHEN sdc.field=3 THEN 'ABSTRACT'
             WHEN sdc.field=4 THEN 'TITLE'
             WHEN sdc.field=5 THEN 'IMAGES'
             WHEN sdc.field=6 THEN 'ATTACHMENTS'
             ELSE 'other'
             END, ',') as fields
 from molecules mols
 join schembl_document_chemistry sdc on sdc.schembl_chem_id = mols.schembl_chem_id and sdc.frequency > 0
 join schembl_document sd on sdc.schembl_doc_id = sd.id
 join schembl_document_title sdt on sdt.schembl_doc_id = sd.id
 group by m, text, sd.id, lang, assign_applic, scpn, published, similarity
 order by similarity desc
--end